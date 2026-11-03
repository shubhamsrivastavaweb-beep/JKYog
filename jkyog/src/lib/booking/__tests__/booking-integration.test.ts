import { afterAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { testDb, closeTestDb } from "../../../db/test-client";
import {
  bookings,
  bookingItems,
  attendees,
  payments,
  ticketTypes,
  promoCodes,
  promoRedemptions,
  extras
} from "../../../db/schema";
import { createBooking } from "../service";
import { BookingServiceError } from "../errors";

describe("Booking integration: concurrent inventory reservation", () => {
  afterAll(async () => {
    await closeTestDb();
  });

  it("allows only one booking when two customers compete for the last ticket", async () => {
    const idempotencyKeys = [randomUUID(), randomUUID()];

    // This test uses only the dedicated test database.
    const request = (idempotencyKey: string) => ({
      booker: {
        firstName: "Test",
        lastName: "Booker",
        email: `test-${idempotencyKey}@example.com`,
        phone: "1234567890",
        dateOfBirth: "2000-01-01",
      },
      tickets: [
        {
          code: "DAY_ADULT" as const,
          quantity: 1,
          dates: ["2026-11-10"],
          attendees: [
            {
              firstName: "Test",
              lastName: "Attendee",
              dateOfBirth: "1985-01-01",
            },
          ],
        },
      ],
      extras: [],
      idempotencyKey,
    });

    try {
      // Give the two requests exactly one ticket to compete for.
      await testDb
        .update(ticketTypes)
        .set({ remainingStock: 1 })
        .where(eq(ticketTypes.code, "DAY_ADULT"));

      const results = await Promise.allSettled(
        idempotencyKeys.map((key) => createBooking(request(key), testDb)),
      );

      const successful = results.filter(
        (result) => result.status === "fulfilled",
      );
      const rejected = results.filter(
        (result) => result.status === "rejected",
      );

      expect(successful).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      if (rejected[0].status === "rejected") {
        expect(rejected[0].reason).toBeInstanceOf(BookingServiceError);
        expect(rejected[0].reason.statusCode).toBe(409);
      }

      // The final ticket must have been reserved exactly once.
      const [ticket] = await testDb
        .select()
        .from(ticketTypes)
        .where(eq(ticketTypes.code, "DAY_ADULT"));

      expect(ticket.remainingStock).toBe(0);

      // Only one booking should have been persisted.
      const persistedBookings = await testDb
        .select()
        .from(bookings)
        .where(inArray(bookings.idempotencyKey, idempotencyKeys));

      expect(persistedBookings).toHaveLength(1);

      const bookingIds = persistedBookings.map((booking) => booking.id);

      const persistedItems = await testDb
        .select()
        .from(bookingItems)
        .where(inArray(bookingItems.bookingId, bookingIds));

      const persistedAttendees = await testDb
        .select()
        .from(attendees)
        .where(inArray(attendees.bookingId, bookingIds));

      const persistedPayments = await testDb
        .select()
        .from(payments)
        .where(inArray(payments.bookingId, bookingIds));

      expect(persistedItems).toHaveLength(1);
      expect(persistedAttendees).toHaveLength(1);
      expect(persistedPayments).toHaveLength(1);
    } finally {
      // Payments use a restrictive FK, so delete them before bookings.
      const testBookings = await testDb
        .select({ id: bookings.id })
        .from(bookings)
        .where(inArray(bookings.idempotencyKey, idempotencyKeys));

      const bookingIds = testBookings.map((booking) => booking.id);

      if (bookingIds.length > 0) {
        await testDb
          .delete(payments)
          .where(inArray(payments.bookingId, bookingIds));

        await testDb
          .delete(bookings)
          .where(inArray(bookings.id, bookingIds));
      }

      // Restore the test catalog's original DAY_ADULT stock.
      await testDb
        .update(ticketTypes)
        .set({ remainingStock: 380 })
        .where(eq(ticketTypes.code, "DAY_ADULT"));
    }
  });
  it("returns the same booking when two identical requests arrive concurrently", async () => {
  const idempotencyKey = randomUUID();

  const request = {
    booker: {
      firstName: "Test",
      lastName: "Idempotency",
      email: `idempotency-${idempotencyKey}@example.com`,
      phone: "1234567890",
      dateOfBirth: "2000-01-01",
    },
    tickets: [
      {
        code: "DAY_ADULT" as const,
        quantity: 1,
        dates: ["2026-11-10"],
        attendees: [
          {
            firstName: "Test",
            lastName: "Attendee",
            dateOfBirth: "1985-01-01",
          },
        ],
      },
    ],
    extras: [],
    idempotencyKey,
  };

  try {
    // Ensure sufficient stock for this test.
    await testDb
      .update(ticketTypes)
      .set({ remainingStock: 10 })
      .where(eq(ticketTypes.code, "DAY_ADULT"));

    // Submit the exact same request twice at the same time.
    const results = await Promise.all([
      createBooking(request, testDb),
      createBooking(request, testDb),
    ]);

    // Both calls must return the same booking.
    expect(results).toHaveLength(2);
    expect(results[0].bookingId).toBe(results[1].bookingId);
    expect(results[0].bookingNumber).toBe(results[1].bookingNumber);
    expect(results[0].paymentStatus).toBe("succeeded");
    expect(results[1].paymentStatus).toBe("succeeded");

    // Only one booking should exist.
    const persistedBookings = await testDb
      .select()
      .from(bookings)
      .where(eq(bookings.idempotencyKey, idempotencyKey));

    expect(persistedBookings).toHaveLength(1);

    const bookingId = persistedBookings[0].id;

    // Only one payment should exist.
    const persistedPayments = await testDb
      .select()
      .from(payments)
      .where(eq(payments.bookingId, bookingId));

    expect(persistedPayments).toHaveLength(1);

    // Inventory should have been deducted only once.
    const [ticket] = await testDb
      .select()
      .from(ticketTypes)
      .where(eq(ticketTypes.code, "DAY_ADULT"));

    expect(ticket.remainingStock).toBe(9);
  } finally {
    // Remove test records. Payments must be deleted before bookings.
    const testBookings = await testDb
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.idempotencyKey, idempotencyKey));

    const bookingIds = testBookings.map((booking) => booking.id);

    if (bookingIds.length > 0) {
      await testDb
        .delete(payments)
        .where(inArray(payments.bookingId, bookingIds));

      await testDb
        .delete(bookings)
        .where(inArray(bookings.id, bookingIds));
    }

    // Restore the original test catalog stock.
    await testDb
      .update(ticketTypes)
      .set({ remainingStock: 380 })
      .where(eq(ticketTypes.code, "DAY_ADULT"));
  }
});
it("prevents concurrent bookings from exceeding a promo-code usage limit", async () => {
const idempotencyKeys = [randomUUID(), randomUUID()];
const promoCode = "SEVA10";

// Read and preserve the original promo configuration.
const [originalPromo] = await testDb
    .select()
    .from(promoCodes)
    .where(eq(promoCodes.code, promoCode));

expect(originalPromo).toBeDefined();

if (!originalPromo) {
    throw new Error(`Test promo code ${promoCode} was not found.`);
}

const originalUsageCount = originalPromo.usageCount;
const originalUsageLimit = originalPromo.usageLimit;

const request = (idempotencyKey: string) => ({
    booker: {
    firstName: "Test",
    lastName: "Promo",
    email: `promo-${idempotencyKey}@example.com`,
    phone: "1234567890",
    dateOfBirth: "2000-01-01",
    },
    tickets: [
    {
        code: "DAY_ADULT" as const,
        quantity: 1,
        dates: ["2026-11-10"],
        attendees: [
        {
            firstName: "Test",
            lastName: "Attendee",
            dateOfBirth: "1985-01-01",
        },
        ],
    },
    ],
    extras: [],
    promoCode,
    idempotencyKey,
});

try {
    // Allow exactly one additional redemption.
    await testDb
    .update(promoCodes)
    .set({
        usageLimit: originalUsageCount + 1,
    })
    .where(eq(promoCodes.id, originalPromo.id));

    // Ensure sufficient ticket inventory for both requests.
    await testDb
    .update(ticketTypes)
    .set({ remainingStock: 10 })
    .where(eq(ticketTypes.code, "DAY_ADULT"));

    const results = await Promise.allSettled(
    idempotencyKeys.map((key) =>
        createBooking(request(key), testDb),
    ),
    );

    const successful = results.filter(
    (result) => result.status === "fulfilled",
    );

    const rejected = results.filter(
    (result) => result.status === "rejected",
    );

    expect(successful).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    if (rejected[0].status === "rejected") {
    expect(rejected[0].reason).toBeInstanceOf(BookingServiceError);
    expect(rejected[0].reason.statusCode).toBe(422);
    }

    // Promo usage must increase exactly once.
    const [updatedPromo] = await testDb
    .select()
    .from(promoCodes)
    .where(eq(promoCodes.id, originalPromo.id));

    expect(updatedPromo.usageCount).toBe(originalUsageCount + 1);
    expect(updatedPromo.usageCount).toBe(updatedPromo.usageLimit);

    // Exactly one redemption should exist for these test bookings.
    const persistedBookings = await testDb
    .select()
    .from(bookings)
    .where(inArray(bookings.idempotencyKey, idempotencyKeys));

    expect(persistedBookings).toHaveLength(1);

    const bookingIds = persistedBookings.map((booking) => booking.id);

    const redemptions = await testDb
    .select()
    .from(promoRedemptions)
    .where(inArray(promoRedemptions.bookingId, bookingIds));

    expect(redemptions).toHaveLength(1);

    // Only one ticket should have been reserved.
    const [ticket] = await testDb
    .select()
    .from(ticketTypes)
    .where(eq(ticketTypes.code, "DAY_ADULT"));

    expect(ticket.remainingStock).toBe(9);
} finally {
    // Find any booking created by this test.
    const testBookings = await testDb
    .select({ id: bookings.id })
    .from(bookings)
    .where(inArray(bookings.idempotencyKey, idempotencyKeys));

    const bookingIds = testBookings.map((booking) => booking.id);

    if (bookingIds.length > 0) {
    // Payments have a restrictive FK, so delete them first.
    await testDb
        .delete(payments)
        .where(inArray(payments.bookingId, bookingIds));

    // Promo redemptions and booking items cascade from bookings.
    await testDb
        .delete(bookings)
        .where(inArray(bookings.id, bookingIds));
    }

    // Restore the original promo configuration.
    await testDb
    .update(promoCodes)
    .set({
        usageCount: originalUsageCount,
        usageLimit: originalUsageLimit,
    })
    .where(eq(promoCodes.id, originalPromo.id));

    // Restore the original test ticket stock.
    await testDb
    .update(ticketTypes)
    .set({ remainingStock: 380 })
    .where(eq(ticketTypes.code, "DAY_ADULT"));
}
});
it("allows only one booking when two customers compete for the last extra", async () => {
const idempotencyKeys = [randomUUID(), randomUUID()];

const request = (idempotencyKey: string) => ({
    booker: {
    firstName: "Test",
    lastName: "Customer",
    email: `extra-${idempotencyKey}@example.com`,
    phone: "1234567890",
    dateOfBirth: "2000-01-01",
    },
    tickets: [
    {
        code: "DAY_ADULT" as const,
        quantity: 1,
        dates: ["2026-11-10"],
        attendees: [
        {
            firstName: "Test",
            lastName: "Attendee",
            dateOfBirth: "1985-01-01",
        },
        ],
    },
    ],
    extras: [
    {
        code: "DANDIYA_STICKS" as const,
        quantity: 1,
    },
    ],
    idempotencyKey,
});

const [ticket] = await testDb
    .select()
    .from(ticketTypes)
    .where(eq(ticketTypes.code, "DAY_ADULT"));

const [extra] = await testDb
    .select()
    .from(extras)
    .where(eq(extras.code, "DANDIYA_STICKS"));

const bookingIds: string[] = [];

try {
    await testDb
    .update(ticketTypes)
    .set({ remainingStock: 10 })
    .where(eq(ticketTypes.code, "DAY_ADULT"));

    await testDb
    .update(extras)
    .set({ remainingStock: 1 })
    .where(eq(extras.code, "DANDIYA_STICKS"));

    const results = await Promise.allSettled(
    idempotencyKeys.map((key) =>
        createBooking(request(key), testDb),
    ),
    );

    const successful = results.filter(
    (result) => result.status === "fulfilled",
    );
    const failed = results.filter(
    (result) => result.status === "rejected",
    );

    expect(successful).toHaveLength(1);
    expect(failed).toHaveLength(1);

    if (failed[0]?.status === "rejected") {
    expect(failed[0].reason).toBeInstanceOf(BookingServiceError);
    expect(failed[0].reason.statusCode).toBe(409);
    }

    const [updatedTicket] = await testDb
    .select()
    .from(ticketTypes)
    .where(eq(ticketTypes.code, "DAY_ADULT"));

    const [updatedExtra] = await testDb
    .select()
    .from(extras)
    .where(eq(extras.code, "DANDIYA_STICKS"));

    expect(updatedTicket.remainingStock).toBe(9);
    expect(updatedExtra.remainingStock).toBe(0);

    const createdBookings = await testDb
    .select()
    .from(bookings)
    .where(inArray(bookings.idempotencyKey, idempotencyKeys));

    expect(createdBookings).toHaveLength(1);

    bookingIds.push(...createdBookings.map((booking) => booking.id));

    const createdItems = await testDb
    .select()
    .from(bookingItems)
    .where(inArray(bookingItems.bookingId, bookingIds));

    expect(createdItems).toHaveLength(2);
} finally {
    if (bookingIds.length > 0) {
    await testDb
        .delete(payments)
        .where(inArray(payments.bookingId, bookingIds));

    await testDb
        .delete(bookings)
        .where(inArray(bookings.id, bookingIds));
    }

    await testDb
    .update(ticketTypes)
    .set({ remainingStock: 380 })
    .where(eq(ticketTypes.code, "DAY_ADULT"));

    await testDb
    .update(extras)
    .set({ remainingStock: 900 })
    .where(eq(extras.code, "DANDIYA_STICKS"));
}
});

});