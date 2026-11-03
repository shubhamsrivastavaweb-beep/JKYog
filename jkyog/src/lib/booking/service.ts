import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  and,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";

import { db } from "../../db/index";
import {
  attendees,
  bookingItemDates,
  bookingItems,
  bookings,
  extras,
  festivalDates,
  payments,
  promoCodes,
  promoRedemptions,
  ticketTypes,
} from "../../db/schema";

import { calculatePricing } from "../pricing/calculate";
import { BookingServiceError } from "./errors";
import { calculateDatabasePricing } from "./database-pricing";
import {
  createBookingNumber,
  createRequestHash,
} from "./transaction-helpers";
import { createBookingSchema } from "./request-schema";

import type { CreateBookingInput } from "./request-schema";
import type {
  CatalogExtra,
  CatalogTicket,
  PricingRequest,
  PricingResult,
} from "../pricing/types";

type BookingDatabase = PostgresJsDatabase<Record<string, unknown>>;

export interface BookingQuote {
  pricing: PricingResult;
}

export interface BookingResult {
  bookingId: string;
  bookingNumber: string;
  status: string;
  currency: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  paymentStatus: string;
}

function mapTicketCatalog(
  rows: (typeof ticketTypes.$inferSelect)[],
): CatalogTicket[] {
  return rows.map((ticket) => ({
    code: ticket.code as CatalogTicket["code"],
    name: ticket.name,
    priceCents: ticket.priceCents,
    remainingStock: ticket.remainingStock,
    pricingModel: ticket.pricingModel as CatalogTicket["pricingModel"],
    minAge: ticket.minAge,
    maxAge: ticket.maxAge,
    admissionDays: ticket.admissionDays,
    isActive: ticket.isActive,
  }));
}

function mapExtraCatalog(
  rows: (typeof extras.$inferSelect)[],
): CatalogExtra[] {
  return rows.map((extra) => ({
    code: extra.code as CatalogExtra["code"],
    name: extra.name,
    priceCents: extra.priceCents,
    remainingStock: extra.remainingStock,
    dateRestricted: extra.dateRestricted,
    isActive: extra.isActive,
  }));
}

function calculatePromoDiscount(
  pricing: PricingResult,
  discountType: "percentage" | "fixed_amount" | "free_children",
  discountValue: number,
): number {
  let discountCents = 0;

  switch (discountType) {
    case "percentage":
      discountCents = Math.round(
        (pricing.subtotalCents * discountValue) / 10000,
      );
      break;

    case "fixed_amount":
      discountCents = Math.min(
        discountValue,
        pricing.subtotalCents,
      );
      break;

    case "free_children":
      discountCents = pricing.lineItems
        .filter(
          (item) =>
            item.code === "DAY_CHILD" ||
            item.code === "ALL_DAYS_CHILD",
        )
        .reduce(
          (total, item) => total + item.lineTotalCents,
          0,
        );
      break;
  }

  return Math.min(discountCents, pricing.subtotalCents);
}

async function findExistingBooking(
  idempotencyKey: string,
): Promise<BookingResult | null> {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.idempotencyKey, idempotencyKey))
    .limit(1);

  if (!booking) {
    return null;
  }

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.bookingId, booking.id))
    .limit(1);

  return {
    bookingId: booking.id,
    bookingNumber: booking.bookingNumber,
    status: booking.status,
    currency: booking.currency,
    subtotalCents: booking.subtotalCents,
    discountCents: booking.discountCents,
    totalCents: booking.totalCents,
    paymentStatus: payment?.status ?? "unknown",
  };
}

/**
 * Loads active tickets and extras from PostgreSQL.
 * Prices and stock are read from the database, never from the client.
 */
export async function loadBookingCatalog(): Promise<{
  tickets: CatalogTicket[];
  extras: CatalogExtra[];
}> {
  // const [ticketRows, extraRows] = await Promise.all([
  //   db.select().from(ticketTypes).where(eq(ticketTypes.isActive, true)),
  //   db.select().from(extras).where(eq(extras.isActive, true)),
  // ]);

  const ticketRows = await db
    .select()
    .from(ticketTypes)
    .where(eq(ticketTypes.isActive, true));

  const extraRows = await db
    .select()
    .from(extras)
    .where(eq(extras.isActive, true));

  const tickets: CatalogTicket[] = ticketRows.map((ticket) => ({
    code: ticket.code as CatalogTicket["code"],
    name: ticket.name,
    priceCents: ticket.priceCents,
    remainingStock: ticket.remainingStock,
    pricingModel: ticket.pricingModel as CatalogTicket["pricingModel"],
    minAge: ticket.minAge,
    maxAge: ticket.maxAge,
    admissionDays: ticket.admissionDays,
    isActive: ticket.isActive,
  }));

  const catalogExtras: CatalogExtra[] = extraRows.map((extra) => ({
    code: extra.code as CatalogExtra["code"],
    name: extra.name,
    priceCents: extra.priceCents,
    remainingStock: extra.remainingStock,
    dateRestricted: extra.dateRestricted,
    isActive: extra.isActive,
  }));

  return { tickets, extras: catalogExtras };
}

/**
 * Produces a server-calculated quote.
 *
 * This is a preliminary quote only. Inventory must be checked and reserved
 * again atomically when the booking is created.
 */
export async function quoteBooking(
  request: PricingRequest,
): Promise<BookingQuote> {
  const catalog = await loadBookingCatalog();

  const pricing = await calculateDatabasePricing(
    request,
    catalog.tickets,
    catalog.extras,
  );

  if (pricing.errors.length > 0) {
    throw new BookingServiceError(pricing.errors.join(" "), 422);
  }

  return { pricing };
}

export async function createBooking(
  //let the service accept unknown input, because the API receives untrusted JSON. The service already validates it using Zod.
  input: unknown,
  database: BookingDatabase = db,
): Promise<BookingResult> {
  const parsed = createBookingSchema.safeParse(input);

  if (!parsed.success) {
    throw new BookingServiceError(
      parsed.error.issues.map((issue) => issue.message).join(". "),
      400,
    );
  }

  const request = {
    ...parsed.data,
    promoCode: parsed.data.promoCode?.trim().toUpperCase(),
  };

  const requestHash = createRequestHash(request);
  const now = new Date();

  // Check for an existing booking before starting a new transaction.
  const existing = await database
    .select()
    .from(bookings)
    .where(eq(bookings.idempotencyKey, request.idempotencyKey))
    .limit(1);

  if (existing.length > 0) {
    const existingBooking = existing[0];

    if (existingBooking.requestHash !== requestHash) {
      throw new BookingServiceError(
        "This idempotency key has already been used with different booking details.",
        409,
      );
    }

    const [payment] = await database
      .select()
      .from(payments)
      .where(eq(payments.bookingId, existingBooking.id))
      .limit(1);

    return {
      bookingId: existingBooking.id,
      bookingNumber: existingBooking.bookingNumber,
      status: existingBooking.status,
      currency: existingBooking.currency,
      subtotalCents: existingBooking.subtotalCents,
      discountCents: existingBooking.discountCents,
      totalCents: existingBooking.totalCents,
      paymentStatus: payment?.status ?? "unknown",
    };
  }

  try {
    return await database.transaction(async (tx) => {
      // 1. Load current active catalog from the database.
      const [ticketRows, extraRows] = await Promise.all([
        tx
          .select()
          .from(ticketTypes)
          .where(eq(ticketTypes.isActive, true)),
        tx
          .select()
          .from(extras)
          .where(eq(extras.isActive, true)),
      ]);

      const ticketCatalog = mapTicketCatalog(ticketRows);
      const extraCatalog = mapExtraCatalog(extraRows);

      // 2. Calculate the base price without applying a promo yet.
      const pricingRequest: PricingRequest = {
        tickets: request.tickets,
        extras: request.extras,
      };

      const basePricing = calculatePricing(
        pricingRequest,
        ticketCatalog,
        extraCatalog,
      );

      if (basePricing.errors.length > 0) {
        throw new BookingServiceError(
          basePricing.errors.join(" "),
          422,
        );
      }

      // 3. Validate the promo code and calculate its discount.
      let promo:
        | typeof promoCodes.$inferSelect
        | null = null;

      let discountCents = 0;

      if (request.promoCode) {
        const [promoRow] = await tx
          .select()
          .from(promoCodes)
          .where(eq(promoCodes.code, request.promoCode))
          .limit(1);

        if (
          !promoRow ||
          !promoRow.isActive ||
          (promoRow.startsAt && promoRow.startsAt > now) ||
          (promoRow.expiresAt && promoRow.expiresAt <= now) ||
          (promoRow.usageLimit !== null &&
            promoRow.usageCount >= promoRow.usageLimit)
        ) {
          throw new BookingServiceError(
            "The promo code is invalid, expired, or has reached its usage limit.",
            422,
          );
        }

        promo = promoRow;

        discountCents = calculatePromoDiscount(
          basePricing,
          promo.discountType,
          promo.discountValue,
        );
      }

      const pricing: PricingResult = {
        ...basePricing,
        discountCents,
        totalCents: basePricing.subtotalCents - discountCents,
        appliedPromoCode: promo?.code ?? null,
      };

      // 4. Resolve all selected festival dates.
      const selectedDates = [
        ...new Set([
          ...request.tickets.flatMap((ticket) => ticket.dates),
          ...request.extras.flatMap((extra) => extra.dates ?? []),
        ]),
      ];

      const dateRows =
        selectedDates.length > 0
          ? await tx
              .select()
              .from(festivalDates)
              .where(
                and(
                  inArray(festivalDates.date, selectedDates),
                  eq(festivalDates.isActive, true),
                ),
              )
          : [];

      const dateIdByValue = new Map(
        dateRows.map((date) => [date.date, date.id]),
      );

      if (dateIdByValue.size !== selectedDates.length) {
        throw new BookingServiceError(
          "One or more selected festival dates are unavailable.",
          422,
        );
      }

      // 5. Create the booking record.
      const bookingId = randomUUID();
      const bookingNumber = createBookingNumber();

      const [createdBooking] = await tx
        .insert(bookings)
        .values({
          id: bookingId,
          bookingNumber,
          bookerName: `${request.booker.firstName} ${request.booker.lastName}`,
          bookerEmail: request.booker.email,
          bookerPhone: request.booker.phone,
          status: "confirmed",
          currency: "USD",
          subtotalCents: pricing.subtotalCents,
          discountCents: pricing.discountCents,
          totalCents: pricing.totalCents,
          promoCodeId: promo?.id ?? null,
          idempotencyKey: request.idempotencyKey,
          requestHash,
          expiresAt: null,
          confirmedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // 6. Reserve ticket inventory and save ticket items.
      for (const selection of request.tickets) {
        const ticket = ticketRows.find(
          (row) => row.code === selection.code,
        );

        if (!ticket) {
          throw new BookingServiceError(
            `Ticket type ${selection.code} is unavailable.`,
            422,
          );
        }

        const [reservedTicket] = await tx
          .update(ticketTypes)
          .set({
            remainingStock: sql`${ticketTypes.remainingStock} - ${selection.quantity}`,
            updatedAt: now,
          })
          .where(
            and(
              eq(ticketTypes.id, ticket.id),
              eq(ticketTypes.isActive, true),
              gte(ticketTypes.remainingStock, selection.quantity),
            ),
          )
          .returning({ id: ticketTypes.id });

        if (!reservedTicket) {
          throw new BookingServiceError(
            `${ticket.name} does not have enough remaining stock.`,
            409,
          );
        }

        const pricedLine = pricing.lineItems.find(
          (item) => item.code === selection.code,
        );

        if (!pricedLine) {
          throw new BookingServiceError(
            `Could not calculate the price for ${selection.code}.`,
            500,
          );
        }

        const [bookingItem] = await tx
          .insert(bookingItems)
          .values({
            bookingId,
            itemType: "ticket",
            ticketTypeId: ticket.id,
            extraId: null,
            quantity: selection.quantity,
            unitPriceCents: pricedLine.unitPriceCents,
            lineTotalCents: pricedLine.lineTotalCents,
            itemName: pricedLine.name,
          })
          .returning({ id: bookingItems.id });

        if (selection.dates.length > 0) {
          await tx.insert(bookingItemDates).values(
            selection.dates.map((date) => ({
              bookingItemId: bookingItem.id,
              festivalDateId: dateIdByValue.get(date)!,
            })),
          );
        }

        if (selection.attendees && selection.attendees.length > 0) {
          await tx.insert(attendees).values(
            selection.attendees.map((attendee) => ({
              bookingId,
              bookingItemId: bookingItem.id,
              firstName: attendee.firstName,
              lastName: attendee.lastName,
              dateOfBirth: attendee.dateOfBirth,
            })),
          );
        }
      }

      // 7. Reserve extra inventory and save extra items.
      for (const selection of request.extras) {
        const extra = extraRows.find(
          (row) => row.code === selection.code,
        );

        if (!extra) {
          throw new BookingServiceError(
            `Extra ${selection.code} is unavailable.`,
            422,
          );
        }

        // Dinner plates consume one unit per person per selected day.
        // Other extras consume one unit per selected quantity.
        const stockToReserve =
          selection.code === "DINNER_PLATE"
            ? selection.quantity * (selection.dates?.length ?? 0)
            : selection.quantity;

        const [reservedExtra] = await tx
          .update(extras)
          .set({
            remainingStock: sql`${extras.remainingStock} - ${stockToReserve}`,
            updatedAt: now,
          })
          .where(
            and(
              eq(extras.id, extra.id),
              eq(extras.isActive, true),
              gte(extras.remainingStock, stockToReserve),
            ),
          )
          .returning({ id: extras.id });

        if (!reservedExtra) {
          throw new BookingServiceError(
            `${extra.name} does not have enough remaining stock.`,
            409,
          );
        }

        const pricedLine = pricing.lineItems.find(
          (item) => item.code === selection.code,
        );

        if (!pricedLine) {
          throw new BookingServiceError(
            `Could not calculate the price for ${selection.code}.`,
            500,
          );
        }

        const [bookingItem] = await tx
          .insert(bookingItems)
          .values({
            bookingId,
            itemType: "extra",
            ticketTypeId: null,
            extraId: extra.id,
            quantity: selection.quantity,
            unitPriceCents: pricedLine.unitPriceCents,
            lineTotalCents: pricedLine.lineTotalCents,
            itemName: pricedLine.name,
          })
          .returning({ id: bookingItems.id });

        if (selection.dates && selection.dates.length > 0) {
          await tx.insert(bookingItemDates).values(
            selection.dates.map((date) => ({
              bookingItemId: bookingItem.id,
              festivalDateId: dateIdByValue.get(date)!,
            })),
          );
        }
      }

      // 8. Atomically increment promo usage.
      if (promo) {
        const [updatedPromo] = await tx
          .update(promoCodes)
          .set({
            usageCount: sql`${promoCodes.usageCount} + 1`,
          })
          .where(
            and(
              eq(promoCodes.id, promo.id),
              eq(promoCodes.isActive, true),
              or(
                isNull(promoCodes.startsAt),
                lte(promoCodes.startsAt, now),
              ),
              or(
                isNull(promoCodes.expiresAt),
                gt(promoCodes.expiresAt, now),
              ),
              or(
                isNull(promoCodes.usageLimit),
                sql`${promoCodes.usageCount} < ${promoCodes.usageLimit}`,
              ),
            ),
          )
          .returning({ id: promoCodes.id });

        if (!updatedPromo) {
          throw new BookingServiceError(
            "The promo code has reached its usage limit or is no longer valid.",
            422,
          );
        }

        await tx.insert(promoRedemptions).values({
          promoCodeId: promo.id,
          bookingId,
          discountCents,
        });
      }

      // 9. Record the simulated successful payment.
      await tx.insert(payments).values({
        bookingId,
        status: "succeeded",
        amountCents: pricing.totalCents,
        currency: "USD",
        provider: "simulated",
        providerReference: `SIM-${randomUUID()}`,
        idempotencyKey: `payment-${request.idempotencyKey}`,
      });

      return {
        bookingId: createdBooking.id,
        bookingNumber: createdBooking.bookingNumber,
        status: createdBooking.status,
        currency: createdBooking.currency,
        subtotalCents: createdBooking.subtotalCents,
        discountCents: createdBooking.discountCents,
        totalCents: createdBooking.totalCents,
        paymentStatus: "succeeded",
      };
    });
  } catch (error) {
    // Handle a concurrent request that used the same idempotency key.
    // The unique constraint ensures only one transaction can create it.
    const [existingBooking] = await database
      .select()
      .from(bookings)
      .where(eq(bookings.idempotencyKey, request.idempotencyKey))
      .limit(1);

    if (existingBooking) {
      if (existingBooking.requestHash !== requestHash) {
        throw new BookingServiceError(
          "This idempotency key has already been used with different booking details.",
          409,
        );
      }

      const [payment] = await database
        .select()
        .from(payments)
        .where(eq(payments.bookingId, existingBooking.id))
        .limit(1);

      return {
        bookingId: existingBooking.id,
        bookingNumber: existingBooking.bookingNumber,
        status: existingBooking.status,
        currency: existingBooking.currency,
        subtotalCents: existingBooking.subtotalCents,
        discountCents: existingBooking.discountCents,
        totalCents: existingBooking.totalCents,
        paymentStatus: payment?.status ?? "unknown",
      };
    }

    throw error;
  }
}