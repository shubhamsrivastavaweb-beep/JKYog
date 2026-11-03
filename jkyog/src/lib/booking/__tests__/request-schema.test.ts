import { describe, expect, it } from "vitest";
import { createBookingSchema } from "../request-schema";

const validBooking = {
  booker: {
    firstName: "Test",
    lastName: "Booker",
    email: "booker@example.com",
    phone: "+1 555 123 4567",
    dateOfBirth: "1990-05-15",
  },
  tickets: [
    {
      code: "DAY_ADULT",
      quantity: 1,
      dates: ["2026-11-10"],
      attendees: [
        {
          firstName: "Test",
          lastName: "Attendee",
          dateOfBirth: "1990-05-15",
        },
      ],
    },
  ],
  extras: [],
  idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
};

describe("createBookingSchema", () => {
  it("accepts a valid booking request", () => {
    expect(createBookingSchema.safeParse(validBooking).success).toBe(true);
  });

  it("rejects a booker under 18", () => {
    const input = {
      ...validBooking,
      booker: {
        ...validBooking.booker,
        dateOfBirth: "2015-01-01",
      },
    };

    expect(createBookingSchema.safeParse(input).success).toBe(false);
  });

  it("rejects an All-Day Pass with only one selected date", () => {
    const input = {
      ...validBooking,
      tickets: [
        {
          ...validBooking.tickets[0],
          code: "ALL_DAYS_ADULT",
        },
      ],
    };

    expect(createBookingSchema.safeParse(input).success).toBe(false);
  });

  it("rejects a workshop on November 12", () => {
    const input = {
      ...validBooking,
      extras: [
        {
          code: "GARBA_WORKSHOP",
          quantity: 1,
          dates: ["2026-11-12"],
        },
      ],
    };

    expect(createBookingSchema.safeParse(input).success).toBe(false);
  });

  it("rejects duplicate dates", () => {
    const input = {
      ...validBooking,
      tickets: [
        {
          ...validBooking.tickets[0],
          dates: ["2026-11-10", "2026-11-10"],
        },
      ],
    };

    expect(createBookingSchema.safeParse(input).success).toBe(false);
  });
});