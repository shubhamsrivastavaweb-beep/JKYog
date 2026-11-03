import { and, eq, gt, gte, lte, isNull, or, sql  } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import { BookingServiceError } from "./errors";
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

import { calculateDatabasePricing } from "./database-pricing";
import { createBookingSchema } from "./request-schema";
import type {
  CatalogExtra,
  CatalogTicket,
  PricingRequest,
  PricingResult,
} from "../../lib/pricing/types";

import type { CreateBookingInput } from "./request-schema";

export interface BookingQuote {
  pricing: PricingResult;
}

/**
 * Loads active tickets and extras from PostgreSQL.
 * Prices and stock are read from the database, never from the client.
 */
export async function loadBookingCatalog(): Promise<{
  tickets: CatalogTicket[];
  extras: CatalogExtra[];
}> {
  const [ticketRows, extraRows] = await Promise.all([
    db.select().from(ticketTypes).where(eq(ticketTypes.isActive, true)),
    db.select().from(extras).where(eq(extras.isActive, true)),
  ]);

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