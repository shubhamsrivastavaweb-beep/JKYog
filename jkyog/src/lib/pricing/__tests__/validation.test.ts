
import { describe, expect, it } from "vitest";
import { validateAttendees } from "../validation";
import type { CatalogTicket, TicketSelection } from "../types";

const adultTicket: CatalogTicket = {
  code: "DAY_ADULT",
  name: "Day Pass Adult",
  priceCents: 1500,
  remainingStock: 380,
  pricingModel: "per_day",
  minAge: 12,
  maxAge: null,
  admissionDays: 1,
  isActive: true,
};

const childTicket: CatalogTicket = {
  code: "DAY_CHILD",
  name: "Day Pass Child",
  priceCents: 800,
  remainingStock: 260,
  pricingModel: "per_day",
  minAge: 5,
  maxAge: 11,
  admissionDays: 1,
  isActive: true,
};

const familyTicket: CatalogTicket = {
  code: "FAMILY_PASS",
  name: "Family Pass",
  priceCents: 4000,
  remainingStock: 95,
  pricingModel: "per_day",
  minAge: null,
  maxAge: null,
  admissionDays: 1,
  isActive: true,
};

describe("validateAttendees", () => {
  it("accepts an adult attendee aged 12 or older", () => {
    const selection: TicketSelection = {
      code: "DAY_ADULT",
      quantity: 1,
      dates: ["2026-11-10"],
      attendees: [
        {
          firstName: "Adult",
          lastName: "Attendee",
          dateOfBirth: "2014-11-10",
        },
      ],
    };

    expect(validateAttendees(selection, adultTicket)).toEqual([]);
  });

  it("accepts a child attendee who is exactly 5", () => {
    const selection: TicketSelection = {
      code: "DAY_CHILD",
      quantity: 1,
      dates: ["2026-11-10"],
      attendees: [
        {
          firstName: "Child",
          lastName: "Attendee",
          dateOfBirth: "2021-11-10",
        },
      ],
    };

    expect(validateAttendees(selection, childTicket)).toEqual([]);
  });

  it("rejects a child younger than 5", () => {
    const selection: TicketSelection = {
      code: "DAY_CHILD",
      quantity: 1,
      dates: ["2026-11-10"],
      attendees: [
        {
          firstName: "Young",
          lastName: "Child",
          dateOfBirth: "2022-11-11",
        },
      ],
    };

    expect(validateAttendees(selection, childTicket)).toContain(
      "Children under 5 do not require a ticket and must not be assigned a paid ticket.",
    );
  });

  it("rejects a 12-year-old on a child ticket", () => {
    const selection: TicketSelection = {
      code: "DAY_CHILD",
      quantity: 1,
      dates: ["2026-11-10"],
      attendees: [
        {
          firstName: "Older",
          lastName: "Child",
          dateOfBirth: "2014-11-10",
        },
      ],
    };

    expect(validateAttendees(selection, childTicket)).toContain(
      "Day Pass Child: attendee exceeds the maximum age.",
    );
  });

  it("rejects a mismatch between ticket quantity and attendee count", () => {
    const selection: TicketSelection = {
      code: "DAY_ADULT",
      quantity: 2,
      dates: ["2026-11-10"],
      attendees: [
        {
          firstName: "Only",
          lastName: "Attendee",
          dateOfBirth: "1990-01-01",
        },
      ],
    };

    expect(validateAttendees(selection, adultTicket)).toContain(
      "Day Pass Adult: provide attendee details for each ticket.",
    );
  });

  it("accepts a Family Pass with two adults and two children", () => {
    const selection: TicketSelection = {
      code: "FAMILY_PASS",
      quantity: 1,
      dates: ["2026-11-10"],
      attendees: [
        { firstName: "Adult", lastName: "One", dateOfBirth: "1985-01-01" },
        { firstName: "Adult", lastName: "Two", dateOfBirth: "1987-01-01" },
        { firstName: "Child", lastName: "One", dateOfBirth: "2018-01-01" },
        { firstName: "Child", lastName: "Two", dateOfBirth: "2020-01-01" },
      ],
    };

    expect(validateAttendees(selection, familyTicket)).toEqual([]);
  });

  it("rejects an invalid Family Pass age composition", () => {
    const selection: TicketSelection = {
      code: "FAMILY_PASS",
      quantity: 1,
      dates: ["2026-11-10"],
      attendees: [
        { firstName: "Adult", lastName: "One", dateOfBirth: "1985-01-01" },
        { firstName: "Adult", lastName: "Two", dateOfBirth: "1987-01-01" },
        { firstName: "Adult", lastName: "Three", dateOfBirth: "1990-01-01" },
        { firstName: "Child", lastName: "One", dateOfBirth: "2018-01-01" },
      ],
    };

    expect(validateAttendees(selection, familyTicket)).toContain(
      "Each Family Pass must cover two adults aged 12+ and two children aged 5–11.",
    );
  });

  it("rejects an invalid date of birth", () => {
    const selection: TicketSelection = {
      code: "DAY_ADULT",
      quantity: 1,
      dates: ["2026-11-10"],
      attendees: [
        {
          firstName: "Invalid",
          lastName: "Date",
          dateOfBirth: "2020-02-30",
        },
      ],
    };

    expect(validateAttendees(selection, adultTicket)).toContain(
      "Day Pass Adult: attendee date of birth is invalid.",
    );
  });
});
