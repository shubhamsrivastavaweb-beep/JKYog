import { z } from "zod";
import type { AttendeeInput } from "../pricing/types";
const FESTIVAL_DATES = [
  "2026-11-10",
  "2026-11-11",
  "2026-11-12",
  "2026-11-13",
  "2026-11-14",
] as const;

const WORKSHOP_DATES = ["2026-11-11", "2026-11-13"] as const;

const festivalDateSchema = z.enum(FESTIVAL_DATES);

const dateOfBirthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD for dates of birth.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Enter a valid date of birth.");

const attendeeSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  dateOfBirth: dateOfBirthSchema,
});



const ticketSelectionBaseSchema = z.object({
  code: z.enum([
    "DAY_ADULT",
    "DAY_CHILD",
    "ALL_DAYS_ADULT",
    "ALL_DAYS_CHILD",
    "FAMILY_PASS",
  ]),
  quantity: z.number().int().min(1).max(20),
  dates: z.array(festivalDateSchema).min(1).max(5),
  attendees: z.array(attendeeSchema).max(80),
});

const validateTicketSelection = (
  ticket: {
    code: string;
    quantity: number;
    dates: string[];
    attendees?: AttendeeInput[];
  },
  context: z.RefinementCtx,
  requireAttendees: boolean
) => {
  if (ticket.code === "FAMILY_PASS" && ticket.dates.length !== 1) {
    context.addIssue({
      code: "custom",
      path: ["dates"],
      message: "A Family Pass is valid for one festival day only.",
    });
  }

  if (new Set(ticket.dates).size !== ticket.dates.length) {
    context.addIssue({
      code: "custom",
      path: ["dates"],
      message: "Duplicate festival dates are not allowed.",
    });
  }

  if (
    ticket.code === "ALL_DAYS_ADULT" ||
    ticket.code === "ALL_DAYS_CHILD"
  ) {
    if (
      ticket.dates.length !== FESTIVAL_DATES.length ||
      FESTIVAL_DATES.some((date) => !ticket.dates.includes(date))
    ) {
      context.addIssue({
        code: "custom",
        path: ["dates"],
        message: "All-Day Passes must include all five festival days.",
      });
    }
  }

  if (requireAttendees) {
    const expectedAttendees =
      ticket.code === "FAMILY_PASS"
        ? ticket.quantity * 4
        : ticket.quantity;

    if (ticket.attendees?.length !== expectedAttendees) {
      context.addIssue({
        code: "custom",
        path: ["attendees"],
        message:
          ticket.code === "FAMILY_PASS"
            ? "Each Family Pass requires two adults and two children."
            : "Provide attendee details for each ticket.",
      });
    }
  }
};

export const ticketSelectionSchema =
  ticketSelectionBaseSchema.superRefine((ticket, context) => {
    validateTicketSelection(ticket, context, true);
  });

const quoteTicketSelectionSchema =
  ticketSelectionBaseSchema
    .omit({ attendees: true })
    .superRefine((ticket, context) => {
      validateTicketSelection(ticket, context, false);
    });

export const extraSelectionSchema = z.object({
  code: z.enum([
    "DANDIYA_STICKS",
    "DINNER_PLATE",
    "GARBA_WORKSHOP",
  ]),
  quantity: z.number().int().min(1).max(100),
  dates: z.array(festivalDateSchema).max(5).optional(),
}).superRefine((extra, context) => {
  const dates = extra.dates ?? [];

  if (new Set(dates).size !== dates.length) {
    context.addIssue({
      code: "custom",
      path: ["dates"],
      message: "Duplicate dates are not allowed.",
    });
  }

  if (extra.code === "DINNER_PLATE" && dates.length === 0) {
    context.addIssue({
      code: "custom",
      path: ["dates"],
      message: "Select at least one date for Dinner Plates.",
    });
  }

  if (
    extra.code === "GARBA_WORKSHOP" &&
    (
      dates.length === 0 ||
      dates.some(
        (date) => !WORKSHOP_DATES.includes(
          date as (typeof WORKSHOP_DATES)[number],
        ),
      )
    )
  ) {
    context.addIssue({
      code: "custom",
      path: ["dates"],
      message:
        "Garba Workshop is available only on November 11 and 13.",
    });
  }
});

export const quoteBookingSchema = z.object({
  // tickets: z.array(ticketSelectionSchema).min(1).max(20),
  tickets: z.array(quoteTicketSelectionSchema).min(1).max(20),
  extras: z.array(extraSelectionSchema).max(20),
  promoCode: z.string().trim().max(50).optional(),
}).superRefine((request, context) => {
  const ticketCodes = request.tickets.map((ticket) => ticket.code);

  if (new Set(ticketCodes).size !== ticketCodes.length) {
    context.addIssue({
      code: "custom",
      path: ["tickets"],
      message: "Each ticket type can only appear once per booking.",
    });
  }

  const extraCodes = request.extras.map((extra) => extra.code);

  if (new Set(extraCodes).size !== extraCodes.length) {
    context.addIssue({
      code: "custom",
      path: ["extras"],
      message: "Each extra type can only appear once per booking.",
    });
  }
});

export const createBookingSchema = z.object({
  booker: z.object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.email(),
    phone: z.string().trim().min(7).max(30),
    dateOfBirth: dateOfBirthSchema,
  }),

  tickets: z.array(ticketSelectionSchema).min(1).max(20),

  extras: z.array(extraSelectionSchema).max(20),

  promoCode: z.string().trim().max(50).optional(),

  idempotencyKey: z.string().uuid(),
}).superRefine((booking, context) => {
  const ticketCodes = booking.tickets.map((ticket) => ticket.code);

  if (new Set(ticketCodes).size !== ticketCodes.length) {
  context.addIssue({
    code: "custom",
    path: ["tickets"],
    message: "Each ticket type can only appear once per booking.",
  });
}

const extraCodes = booking.extras.map((extra) => extra.code);

if (new Set(extraCodes).size !== extraCodes.length) {
  context.addIssue({
    code: "custom",
    path: ["extras"],
    message: "Each extra type can only appear once per booking.",
  });
}
  // The person making the booking must be at least 18 on the
  // first festival day. The server will independently validate
  // attendee ages against their selected admission dates.
  const dob = new Date(
    `${booking.booker.dateOfBirth}T00:00:00.000Z`,
  );

  const eventDate = new Date("2026-11-10T00:00:00.000Z");

  let age = eventDate.getUTCFullYear() - dob.getUTCFullYear();

  if (
    eventDate.getUTCMonth() < dob.getUTCMonth() ||
    (
      eventDate.getUTCMonth() === dob.getUTCMonth() &&
      eventDate.getUTCDate() < dob.getUTCDate()
    )
  ) {
    age--;
  }

  if (age < 18) {
    context.addIssue({
      code: "custom",
      path: ["booker", "dateOfBirth"],
      message: "The person booking must be at least 18 years old.",
    });
  }
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;