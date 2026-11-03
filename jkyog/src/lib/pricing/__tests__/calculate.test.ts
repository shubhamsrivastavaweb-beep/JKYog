
import { describe, expect, it } from "vitest";
import { calculatePricing } from "../calculate";
import type { CatalogExtra, CatalogTicket } from "../types";

const adult = {
  firstName: "Adult",
  lastName: "Attendee",
  dateOfBirth: "1990-05-15",
};

const child = {
  firstName: "Child",
  lastName: "Attendee",
  dateOfBirth: "2018-05-15",
};

const tickets: CatalogTicket[] = [
  {
    code: "DAY_ADULT",
    name: "Day Pass Adult",
    priceCents: 1500,
    remainingStock: 380,
    pricingModel: "per_day",
    minAge: 12,
    maxAge: null,
    admissionDays: 1,
    isActive: true,
  },
  {
    code: "DAY_CHILD",
    name: "Day Pass Child",
    priceCents: 800,
    remainingStock: 260,
    pricingModel: "per_day",
    minAge: 5,
    maxAge: 11,
    admissionDays: 1,
    isActive: true,
  },
  {
    code: "ALL_DAYS_ADULT",
    name: "All-Day Pass Adult",
    priceCents: 6000,
    remainingStock: 0,
    pricingModel: "flat",
    minAge: 12,
    maxAge: null,
    admissionDays: 5,
    isActive: true,
  },
  {
    code: "ALL_DAYS_CHILD",
    name: "All-Day Pass Child",
    priceCents: 3000,
    remainingStock: 140,
    pricingModel: "flat",
    minAge: 5,
    maxAge: 11,
    admissionDays: 5,
    isActive: true,
  },
  {
    code: "FAMILY_PASS",
    name: "Family Pass",
    priceCents: 4000,
    remainingStock: 95,
    pricingModel: "per_day",
    minAge: null,
    maxAge: null,
    admissionDays: 1,
    isActive: true,
  },
];

const extras: CatalogExtra[] = [
  {
    code: "DANDIYA_STICKS",
    name: "Dandiya Sticks (pair)",
    priceCents: 500,
    remainingStock: 900,
    dateRestricted: false,
    isActive: true,
  },
  {
    code: "DINNER_PLATE",
    name: "Dinner Plate",
    priceCents: 1200,
    remainingStock: 1700,
    dateRestricted: false,
    isActive: true,
  },
  {
    code: "GARBA_WORKSHOP",
    name: "Garba Workshop",
    priceCents: 2000,
    remainingStock: 2,
    dateRestricted: true,
    isActive: true,
  },
];

describe("calculatePricing", () => {
  it("calculates an adult day pass for two people and two days", () => {
    const result = calculatePricing(
      {
        tickets: [
          {
            code: "DAY_ADULT",
            quantity: 2,
            dates: ["2026-11-10", "2026-11-11"],
            attendees: [
              adult,
              { ...adult, firstName: "Second" },
            ],
          },
        ],
        extras: [],
      },
      tickets,
      extras,
    );

    expect(result.subtotalCents).toBe(6000);
    expect(result.discountCents).toBe(0);
    expect(result.totalCents).toBe(6000);
    expect(result.errors).toEqual([]);
  });

  it("applies SEVA10 as a 10% discount", () => {
    const result = calculatePricing(
      {
        tickets: [
          {
            code: "DAY_ADULT",
            quantity: 1,
            dates: ["2026-11-10"],
            attendees: [adult],
          },
        ],
        extras: [],
        promoCode: "SEVA10",
      },
      tickets,
      extras,
    );

    expect(result.subtotalCents).toBe(1500);
    expect(result.discountCents).toBe(150);
    expect(result.totalCents).toBe(1350);
    expect(result.appliedPromoCode).toBe("SEVA10");
    expect(result.errors).toEqual([]);
  });

  it("applies FLAT20 but never discounts below zero", () => {
    const result = calculatePricing(
      {
        tickets: [
          {
            code: "DAY_ADULT",
            quantity: 1,
            dates: ["2026-11-10"],
            attendees: [adult],
          },
        ],
        extras: [],
        promoCode: "FLAT20",
      },
      tickets,
      extras,
    );

    expect(result.subtotalCents).toBe(1500);
    expect(result.discountCents).toBe(1500);
    expect(result.totalCents).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it("makes child ticket lines free with KIDSFREE", () => {
    const result = calculatePricing(
      {
        tickets: [
          {
            code: "DAY_ADULT",
            quantity: 1,
            dates: ["2026-11-10"],
            attendees: [adult],
          },
          {
            code: "DAY_CHILD",
            quantity: 1,
            dates: ["2026-11-10"],
            attendees: [child],
          },
        ],
        extras: [],
        promoCode: "KIDSFREE",
      },
      tickets,
      extras,
    );

    expect(result.subtotalCents).toBe(2300);
    expect(result.discountCents).toBe(800);
    expect(result.totalCents).toBe(1500);
    expect(result.errors).toEqual([]);
  });

  it("rejects an expired promo code", () => {
    const result = calculatePricing(
      {
        tickets: [
          {
            code: "DAY_ADULT",
            quantity: 1,
            dates: ["2026-11-10"],
            attendees: [adult],
          },
        ],
        extras: [],
        promoCode: "EXPIRED5",
      },
      tickets,
      extras,
    );

    expect(result.errors).toContain("This promo code has expired.");
    expect(result.discountCents).toBe(0);
  });

  it("rejects a promo code that reached its usage limit", () => {
    const result = calculatePricing(
      {
        tickets: [
          {
            code: "DAY_ADULT",
            quantity: 1,
            dates: ["2026-11-10"],
            attendees: [adult],
          },
        ],
        extras: [],
        promoCode: "MAXEDOUT",
      },
      tickets,
      extras,
    );

    expect(result.errors).toContain(
      "This promo code has reached its usage limit.",
    );
    expect(result.discountCents).toBe(0);
  });

  it("rejects an unknown promo code", () => {
    const result = calculatePricing(
      {
        tickets: [
          {
            code: "DAY_ADULT",
            quantity: 1,
            dates: ["2026-11-10"],
            attendees: [adult],
          },
        ],
        extras: [],
        promoCode: "NOTREAL",
      },
      tickets,
      extras,
    );

    expect(result.errors).toContain("Invalid promo code.");
    expect(result.discountCents).toBe(0);
  });

  it("rejects the sold-out All-Day Adult Pass", () => {
    const result = calculatePricing(
      {
        tickets: [
          {
            code: "ALL_DAYS_ADULT",
            quantity: 1,
            dates: [
              "2026-11-10",
              "2026-11-11",
              "2026-11-12",
              "2026-11-13",
              "2026-11-14",
            ],
            attendees: [adult],
          },
        ],
        extras: [],
      },
      tickets,
      extras,
    );

    expect(result.errors).toContain(
      "All-Day Pass Adult: not enough tickets remain.",
    );
  });

  it("rejects an All-Day Pass with fewer than five dates", () => {
    const result = calculatePricing(
      {
        tickets: [
          {
            code: "ALL_DAYS_CHILD",
            quantity: 1,
            dates: [
              "2026-11-10",
              "2026-11-11",
              "2026-11-12",
              "2026-11-13",
            ],
            attendees: [child],
          },
        ],
        extras: [],
      },
      tickets,
      extras,
    );

    expect(result.errors).toContain(
      "All-Day Pass Child includes all five festival days.",
    );
  });

  it("calculates Dinner Plate pricing for multiple days", () => {
    const result = calculatePricing(
      {
        tickets: [
          {
            code: "DAY_ADULT",
            quantity: 1,
            dates: ["2026-11-10"],
            attendees: [adult],
          },
        ],
        extras: [
          {
            code: "DINNER_PLATE",
            quantity: 2,
            dates: ["2026-11-10", "2026-11-11"],
          },
        ],
      },
      tickets,
      extras,
    );

    expect(result.subtotalCents).toBe(6300);
    expect(result.lineItems[1].unitPriceCents).toBe(2400);
    expect(result.lineItems[1].lineTotalCents).toBe(4800);
    expect(result.errors).toEqual([]);
  });

  it("calculates Dandiya Sticks pricing", () => {
    const result = calculatePricing(
      {
        tickets: [
          {
            code: "DAY_ADULT",
            quantity: 1,
            dates: ["2026-11-10"],
            attendees: [adult],
          },
        ],
        extras: [
          {
            code: "DANDIYA_STICKS",
            quantity: 2,
          },
        ],
      },
      tickets,
      extras,
    );

    expect(result.subtotalCents).toBe(2500);
    expect(result.errors).toEqual([]);
  });

  it("accepts a Garba Workshop on an eligible date", () => {
    const result = calculatePricing(
      {
        tickets: [],
        extras: [
          {
            code: "GARBA_WORKSHOP",
            quantity: 1,
            dates: ["2026-11-11"],
          },
        ],
      },
      tickets,
      extras,
    );

    expect(result.subtotalCents).toBe(2000);
    expect(result.errors).toEqual([]);
  });

  it("rejects a Garba Workshop on an unavailable date", () => {
    const result = calculatePricing(
      {
        tickets: [],
        extras: [
          {
            code: "GARBA_WORKSHOP",
            quantity: 1,
            dates: ["2026-11-12"],
          },
        ],
      },
      tickets,
      extras,
    );

    expect(result.errors).toContain(
      "Garba Workshop is only available on November 11 and 13.",
    );
  });

  it("rejects an extra quantity greater than available stock", () => {
    const result = calculatePricing(
      {
        tickets: [],
        extras: [
          {
            code: "GARBA_WORKSHOP",
            quantity: 3,
            dates: ["2026-11-11"],
          },
        ],
      },
      tickets,
      extras,
    );

    expect(result.errors).toContain(
      "Garba Workshop: not enough stock remains.",
    );
  });

  it("rejects a duplicate festival date", () => {
    const result = calculatePricing(
      {
        tickets: [
          {
            code: "DAY_ADULT",
            quantity: 1,
            dates: ["2026-11-10", "2026-11-10"],
            attendees: [adult],
          },
        ],
        extras: [],
      },
      tickets,
      extras,
    );

    expect(result.errors).toContain(
      "Day Pass Adult: duplicate dates are not allowed.",
    );
  });
  it("rejects Dinner Plates when quantity multiplied by selected days exceeds stock", () => {
  const request = {
    tickets: [],
    extras: [
      {
        code: "DINNER_PLATE" as const,
        quantity: 2,
        dates: [
          "2026-11-10",
          "2026-11-11",
          "2026-11-12",
        ],
      },
    ],
  };

  const result = calculatePricing(
    request,
    [],
    [
      {
        code: "DINNER_PLATE",
        name: "Dinner Plate",
        priceCents: 1200,
        remainingStock: 5,
        dateRestricted: true,
        isActive: true,
      },
    ],
  );

  expect(result.errors).toContain(
    "Dinner Plate: not enough stock remains.",
  );
});
});
