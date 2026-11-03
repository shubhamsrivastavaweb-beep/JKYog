export type PricingModel = "per_day" | "flat";

export type TicketCode =
  | "DAY_ADULT"
  | "DAY_CHILD"
  | "ALL_DAYS_ADULT"
  | "ALL_DAYS_CHILD"
  | "FAMILY_PASS";

export type ExtraCode =
  | "DANDIYA_STICKS"
  | "DINNER_PLATE"
  | "GARBA_WORKSHOP";

export type PromoCode =
  | "SEVA10"
  | "FLAT20"
  | "KIDSFREE"
  | "EXPIRED5"
  | "MAXEDOUT";

export interface CatalogTicket {
  code: TicketCode;
  name: string;
  priceCents: number;
  remainingStock: number;
  pricingModel: PricingModel;
  minAge: number | null;
  maxAge: number | null;
  admissionDays: number;
  isActive: boolean;
}

export interface CatalogExtra {
  code: ExtraCode;
  name: string;
  priceCents: number;
  remainingStock: number;
  dateRestricted: boolean;
  isActive: boolean;
}

export interface AttendeeInput {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date: YYYY-MM-DD
}

export interface TicketSelection {
  code: TicketCode;
  quantity: number;
  dates: string[];
  attendees?: AttendeeInput[];
}

export interface ExtraSelection {
  code: ExtraCode;
  quantity: number;
  dates?: string[];
}

export interface PricingRequest {
  tickets: TicketSelection[];
  extras: ExtraSelection[];
  promoCode?: string;
}

export interface PricedLineItem {
  code: TicketCode | ExtraCode;
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface PricingResult {
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  lineItems: PricedLineItem[];
  appliedPromoCode: string | null;
  errors: string[];
};


