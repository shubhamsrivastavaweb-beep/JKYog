import type {
  CatalogExtra,
  CatalogTicket,
  PricingRequest,
  PricingResult,
} from "../pricing/types";

import { calculatePricing } from "../pricing/calculate";
import { loadValidPromo } from "./promo";

export async function calculateDatabasePricing(
  request: PricingRequest,
  tickets: CatalogTicket[],
  extras: CatalogExtra[],
): Promise<PricingResult> {
  // Calculate the base price without using hardcoded promo definitions.
  const baseResult = calculatePricing(
    {
      ...request,
      promoCode: undefined,
    },
    tickets,
    extras,
  );

  if (baseResult.errors.length > 0 || !request.promoCode?.trim()) {
    return baseResult;
  }

  // Validate the promo against PostgreSQL.
  const promo = await loadValidPromo(request.promoCode);

  let discountCents = 0;

  switch (promo.discountType) {
    case "percentage":
      // discountValue is stored in basis points: 1000 = 10%.
      discountCents = Math.round(
        (baseResult.subtotalCents * promo.discountValue) / 10000,
      );
      break;

    case "fixed_amount":
      // Fixed discounts are stored in cents.
      discountCents = Math.min(
        promo.discountValue,
        baseResult.subtotalCents,
      );
      break;

    case "free_children":
      discountCents = baseResult.lineItems
        .filter(
          (item) =>
            item.code === "DAY_CHILD" ||
            item.code === "ALL_DAYS_CHILD",
        )
        .reduce((sum, item) => sum + item.lineTotalCents, 0);
      break;
  }

  discountCents = Math.min(discountCents, baseResult.subtotalCents);

  return {
    ...baseResult,
    discountCents,
    totalCents: baseResult.subtotalCents - discountCents,
    appliedPromoCode: promo.code,
  };
}