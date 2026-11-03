import { describe, expect, it } from "vitest";
import { calculatePricing } from "../calculate";
import type { CatalogExtra, CatalogTicket } from "../types";

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

    it("calculates an adult day pass for two selected days", () => {
    const result = calculatePricing(
        {
        tickets: [
            {
            code: "DAY_ADULT",
            quantity: 2,
            dates: ["2026-11-10", "2026-11-11"],
            attendees: [
                {
                firstName: "Adult",
                lastName: "One",
                dateOfBirth: "1990-05-15",
                },
                {
                firstName: "Adult",
                lastName: "Two",
                dateOfBirth: "1985-08-20",
                },
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
});