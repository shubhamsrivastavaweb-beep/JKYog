
import { db , client} from "./index";
import {
  extras,
  festivalDates,
  promoCodes,
  ticketTypes,
} from "./schema";

async function seed() {
  console.log("Seeding Sharad Utsav 2026 catalog...");

  // 1. Festival dates
  const dates = [
    { date: "2026-11-10", label: "November 10, 2026" },
    { date: "2026-11-11", label: "November 11, 2026" },
    { date: "2026-11-12", label: "November 12, 2026" },
    { date: "2026-11-13", label: "November 13, 2026" },
    { date: "2026-11-14", label: "November 14, 2026" },
  ];

  for (const item of dates) {
    await db
      .insert(festivalDates)
      .values(item)
      .onConflictDoUpdate({
        target: festivalDates.date,
        set: {
          label: item.label,
          isActive: true,
        },
      });
  }

  // 2. Ticket types
  const tickets = [
    {
      code: "DAY_ADULT",
      name: "Day Pass - Adult",
      description: "Admission for one adult aged 12 or older for one selected day.",
      priceCents: 1500,
      totalStock: 380,
      remainingStock: 380,
      pricingModel: "per_day",
      minAge: 12,
      maxAge: null,
      admissionDays: 1,
      isActive: true,
    },
    {
      code: "DAY_CHILD",
      name: "Day Pass - Child",
      description: "Admission for one child aged 5-11 for one selected day.",
      priceCents: 800,
      totalStock: 260,
      remainingStock: 260,
      pricingModel: "per_day",
      minAge: 5,
      maxAge: 11,
      admissionDays: 1,
      isActive: true,
    },
    {
      code: "ALL_DAYS_ADULT",
      name: "All-Day Pass - Adult",
      description: "Admission for one adult aged 12 or older across all five festival days.",
      priceCents: 6000,
      totalStock: 0,
      remainingStock: 0,
      pricingModel: "flat",
      minAge: 12,
      maxAge: null,
      admissionDays: 5,
      isActive: true,
    },
    {
      code: "ALL_DAYS_CHILD",
      name: "All-Day Pass - Child",
      description: "Admission for one child aged 5-11 across all five festival days.",
      priceCents: 3000,
      totalStock: 140,
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
      description: "Admission for two adults and two children on one selected day.",
      priceCents: 4000,
      totalStock: 95,
      remainingStock: 95,
      pricingModel: "per_day",
      minAge: null,
      maxAge: null,
      admissionDays: 1,
      isActive: true,
    },
  ];

  for (const ticket of tickets) {
    await db
      .insert(ticketTypes)
      .values(ticket)
      .onConflictDoUpdate({
        target: ticketTypes.code,
        set: {
          name: ticket.name,
          description: ticket.description,
          priceCents: ticket.priceCents,
          pricingModel: ticket.pricingModel,
          minAge: ticket.minAge,
          maxAge: ticket.maxAge,
          admissionDays: ticket.admissionDays,
          isActive: ticket.isActive,
        },
      });
  }

  // 3. Extras
  const extraItems = [
    {
      code: "DANDIYA_STICKS",
      name: "Dandiya Sticks (Pair)",
      description: "One pair of Dandiya sticks.",
      priceCents: 500,
      totalStock: 900,
      remainingStock: 900,
      dateRestricted: false,
      isActive: true,
    },
    {
      code: "DINNER_PLATE",
      name: "Dinner Plate",
      description: "One dinner plate per person per selected day.",
      priceCents: 1200,
      totalStock: 1700,
      remainingStock: 1700,
      dateRestricted: false,
      isActive: true,
    },
    {
      code: "GARBA_WORKSHOP",
      name: "Garba Workshop",
      description: "Workshop admission on November 11 or November 13, 2026.",
      priceCents: 2000,
      totalStock: 2,
      remainingStock: 2,
      dateRestricted: true,
      isActive: true,
    },
  ];

  for (const extra of extraItems) {
    await db
      .insert(extras)
      .values(extra)
      .onConflictDoUpdate({
        target: extras.code,
        set: {
          name: extra.name,
          description: extra.description,
          priceCents: extra.priceCents,
          dateRestricted: extra.dateRestricted,
          isActive: extra.isActive,
        },
      });
  }

  // 4. Promo codes
  const promoItems = [
    {
      code: "SEVA10",
      description: "10% off the booking.",
      discountType: "percentage" as const,
      discountValue: 1000,
      startsAt: null,
      expiresAt: null,
      usageLimit: null,
      usageCount: 0,
      isActive: true,
    },
    {
      code: "FLAT20",
      description: "$20 off the booking.",
      discountType: "fixed_amount" as const,
      discountValue: 2000,
      startsAt: null,
      expiresAt: null,
      usageLimit: null,
      usageCount: 0,
      isActive: true,
    },
    {
      code: "KIDSFREE",
      description: "Eligible child tickets are free.",
      discountType: "free_children" as const,
      discountValue: 0,
      startsAt: null,
      expiresAt: null,
      usageLimit: null,
      usageCount: 0,
      isActive: true,
    },
    {
      code: "EXPIRED5",
      description: "Expired promotional code.",
      discountType: "percentage" as const,
      discountValue: 500,
      startsAt: null,
      expiresAt: new Date("2026-10-01T00:00:00.000Z"),
      usageLimit: null,
      usageCount: 0,
      isActive: true,
    },
    {
      code: "MAXEDOUT",
      description: "Promotional code whose usage limit has been reached.",
      discountType: "fixed_amount" as const,
      discountValue: 1000,
      startsAt: null,
      expiresAt: null,
      usageLimit: 1,
      usageCount: 1,
      isActive: true,
    },
  ];

  for (const promo of promoItems) {
    await db
      .insert(promoCodes)
      .values(promo)
      .onConflictDoUpdate({
        target: promoCodes.code,
        set: {
          description: promo.description,
          discountType: promo.discountType,
          discountValue: promo.discountValue,
          startsAt: promo.startsAt,
          expiresAt: promo.expiresAt,
          usageLimit: promo.usageLimit,
          isActive: promo.isActive,
        },
      });
  }

  console.log("Festival catalog seeded successfully.");
}

seed()
  .catch((error: unknown) => {
    console.error("Festival catalog seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });