import type {
  CatalogExtra,
  CatalogTicket,
  ExtraSelection,
  PricedLineItem,
  PricingRequest,
  PricingResult,
  TicketSelection,
} from "./types";

import { validateAttendees } from "./validation";

const FESTIVAL_DATES = [
  "2026-11-10",
  "2026-11-11",
  "2026-11-12",
  "2026-11-13",
  "2026-11-14",
];

const WORKSHOP_DATES = ["2026-11-11", "2026-11-13"];

interface PromoDefinition {
  type: "percentage" | "fixed_amount" | "free_children";
  value: number;
  valid: boolean;
}

const PROMOS: Record<string, PromoDefinition> = {
  SEVA10: { type: "percentage", value: 1000, valid: true },
  FLAT20: { type: "fixed_amount", value: 2000, valid: true },
  KIDSFREE: { type: "free_children", value: 0, valid: true },
  EXPIRED5: { type: "percentage", value: 500, valid: false },
  MAXEDOUT: { type: "fixed_amount", value: 1000, valid: false },
};

function isPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function isValidDate(date: string): boolean {
  return FESTIVAL_DATES.includes(date);
}

function validateDates(
  dates: string[],
  errors: string[],
  label: string,
): void {
  if (dates.length === 0) {
    errors.push(`${label}: select at least one festival date.`);
    return;
  }

  if (new Set(dates).size !== dates.length) {
    errors.push(`${label}: duplicate dates are not allowed.`);
  }

  if (dates.some((date) => !isValidDate(date))) {
    errors.push(`${label}: contains an invalid festival date.`);
  }
}

function calculateTicketLine(
  selection: TicketSelection,
  ticket: CatalogTicket,
  errors: string[],
): PricedLineItem | null {
  if (!isPositiveInteger(selection.quantity)) {
    errors.push(`${ticket.name}: quantity must be a positive integer.`);
    return null;
  }

  if (!ticket.isActive) {
    errors.push(`${ticket.name} is unavailable.`);
    return null;
  }

  if (selection.quantity > ticket.remainingStock) {
    errors.push(`${ticket.name}: not enough tickets remain.`);
    return null;
  }

  validateDates(selection.dates, errors, ticket.name);

  if (selection.dates.some((date) => !isValidDate(date))) {
    return null;
  }

  if (ticket.pricingModel === "flat") {
    if (
      selection.dates.length !== FESTIVAL_DATES.length ||
      FESTIVAL_DATES.some((date) => !selection.dates.includes(date))
    ) {
      errors.push(`${ticket.name} includes all five festival days.`);
      return null;
    }
  }

  if (ticket.pricingModel === "per_day" && selection.dates.length === 0) {
    return null;
  }

  const unitPriceCents =
    ticket.pricingModel === "per_day"
      ? ticket.priceCents * selection.dates.length
      : ticket.priceCents;

  return {
    code: ticket.code,
    name: ticket.name,
    quantity: selection.quantity,
    unitPriceCents,
    lineTotalCents: unitPriceCents * selection.quantity,
  };
}

function calculateExtraLine(
  selection: ExtraSelection,
  extra: CatalogExtra,
  errors: string[],
): PricedLineItem | null {
  if (!isPositiveInteger(selection.quantity)) {
    errors.push(`${extra.name}: quantity must be a positive integer.`);
    return null;
  }

  if (!extra.isActive) {
    errors.push(`${extra.name} is unavailable.`);
    return null;
  }

  const requiredStock =
  extra.code === "DINNER_PLATE"
    ? selection.quantity * (selection.dates?.length ?? 0)
    : selection.quantity;

if (requiredStock > extra.remainingStock) {
  errors.push(`${extra.name}: not enough stock remains.`);
  return null;
}

  if (extra.code === "GARBA_WORKSHOP") {
    if (!selection.dates || selection.dates.length === 0) {
      errors.push("Garba Workshop requires a date.");
      return null;
    }

    if (
      selection.dates.some((date) => !WORKSHOP_DATES.includes(date))
    ) {
      errors.push("Garba Workshop is only available on November 11 and 13.");
      return null;
    }
  }

  if (extra.code === "DINNER_PLATE") {
    if (!selection.dates || selection.dates.length === 0) {
      errors.push("Dinner Plate requires at least one date.");
      return null;
    }

    validateDates(selection.dates, errors, extra.name);
  }

  const dates = selection.dates ?? [];

  const unitPriceCents =
  extra.code === "DINNER_PLATE"
    ? extra.priceCents * dates.length
    : extra.priceCents;

  return {
    code: extra.code,
    name: extra.name,
    quantity: selection.quantity, unitPriceCents,
    lineTotalCents: unitPriceCents * selection.quantity,
  };
}

function applyPromo(
  promoCode: string | undefined,
  lineItems: PricedLineItem[],
  subtotalCents: number,
  errors: string[],
): { appliedPromoCode: string | null; discountCents: number } {
  if (!promoCode?.trim()) {
    return { appliedPromoCode: null, discountCents: 0 };
  }

  const normalizedCode = promoCode.trim().toUpperCase();
  const promo = PROMOS[normalizedCode];

  if (!promo) {
    errors.push("Invalid promo code.");
    return { appliedPromoCode: null, discountCents: 0 };
  }

  if (!promo.valid) {
    errors.push(
      normalizedCode === "EXPIRED5"
        ? "This promo code has expired."
        : "This promo code has reached its usage limit.",
    );

    return { appliedPromoCode: null, discountCents: 0 };
  }

  let discountCents = 0;

  if (promo.type === "percentage") {
    discountCents = Math.round((subtotalCents * promo.value) / 10000);
  } else if (promo.type === "fixed_amount") {
    discountCents = Math.min(promo.value, subtotalCents);
  } else if (promo.type === "free_children") {
    const childItems = lineItems.filter(
      (item) => item.code === "DAY_CHILD" || item.code === "ALL_DAYS_CHILD",
    );

    discountCents = childItems.reduce(
      (total, item) => total + item.lineTotalCents,
      0,
    );
  }

  return {
    appliedPromoCode: normalizedCode,
    discountCents: Math.min(discountCents, subtotalCents),
  };
}

export function calculatePricing(
  request: PricingRequest,
  tickets: CatalogTicket[],
  extras: CatalogExtra[],
  options: { validateAttendeeDetails?: boolean } = {},
): PricingResult {
  const { validateAttendeeDetails = true } = options;

  const errors: string[] = [];
  const lineItems: PricedLineItem[] = [];

  const ticketMap = new Map(tickets.map((ticket) => [ticket.code, ticket]));
  const extraMap = new Map(extras.map((extra) => [extra.code, extra]));

  for (const selection of request.tickets) {
    const ticket = ticketMap.get(selection.code);

    if (!ticket) {
      errors.push(`Unknown ticket type: ${selection.code}.`);
      continue;
    }

    if (validateAttendeeDetails) {
      errors.push(...validateAttendees(selection, ticket));
    }

    const line = calculateTicketLine(selection, ticket, errors);

    if (line) {
      lineItems.push(line);
    }
  }

  for (const selection of request.extras) {
    const extra = extraMap.get(selection.code);

    if (!extra) {
      errors.push(`Unknown extra: ${selection.code}.`);
      continue;
    }

    const line = calculateExtraLine(selection, extra, errors);

    if (line) {
      lineItems.push(line);
    }
  }

  const subtotalCents = lineItems.reduce(
    (total, item) => total + item.lineTotalCents,
    0,
  );

  const promo = applyPromo(
    request.promoCode,
    lineItems,
    subtotalCents,
    errors,
  );

  return {
    subtotalCents,
    discountCents: promo.discountCents,
    totalCents: subtotalCents - promo.discountCents,
    lineItems,
    appliedPromoCode: promo.appliedPromoCode,
    errors,
  };
}