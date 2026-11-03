import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { promoCodes } from "../../db/schema";
import { BookingServiceError } from "./errors";

export interface DatabasePromo {
  id: string;
  code: string;
  discountType: "percentage" | "fixed_amount" | "free_children";
  discountValue: number;
}

export async function loadValidPromo(
  rawCode: string,
): Promise<DatabasePromo> {
  const code = rawCode.trim().toUpperCase();
  const now = new Date();

  const [promo] = await db
    .select({
      id: promoCodes.id,
      code: promoCodes.code,
      discountType: promoCodes.discountType,
      discountValue: promoCodes.discountValue,
      startsAt: promoCodes.startsAt,
      expiresAt: promoCodes.expiresAt,
      usageLimit: promoCodes.usageLimit,
      usageCount: promoCodes.usageCount,
      isActive: promoCodes.isActive,
    })
    .from(promoCodes)
    .where(eq(promoCodes.code, code))
    .limit(1);

  if (!promo || !promo.isActive) {
    throw new BookingServiceError("Invalid promo code.", 422);
  }

  if (promo.startsAt && promo.startsAt > now) {
    throw new BookingServiceError(
      "This promo code is not active yet.",
      422,
    );
  }

  if (promo.expiresAt && promo.expiresAt <= now) {
    throw new BookingServiceError(
      "This promo code has expired.",
      422,
    );
  }

  if (
    promo.usageLimit !== null &&
    promo.usageCount >= promo.usageLimit
  ) {
    throw new BookingServiceError(
      "This promo code has reached its usage limit.",
      422,
    );
  }

  return {
    id: promo.id,
    code: promo.code,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
  };
}