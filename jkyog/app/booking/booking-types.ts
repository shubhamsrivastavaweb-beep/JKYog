
export type FestivalDate = {
  date: string;
  label: string;
};

export type Ticket = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceCents: number;
  remainingStock: number;
  pricingModel: "per_day" | "flat";
  minAge: number | null;
  maxAge: number | null;
  admissionDays: number;
  isActive: boolean;
};

export type Extra = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceCents: number;
  remainingStock: number;
  dateRestricted: boolean;
  isActive: boolean;
};

export type Catalog = {
  festivalDates: FestivalDate[];
  tickets: Ticket[];
  extras: Extra[];
};

export type Attendee = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
};

export type TicketSelection = {
  code: string;
  quantity: number;
  dates: string[];
  attendees: Attendee[];
};

export type ExtraSelection = {
  code: string;
  quantity: number;
  dates: string[];
};

export type BookingStep =
  | "tickets"
  | "attendees"
  | "extras"
  | "checkout"
  | "confirmation";

export type BookerDetails = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
};

export type BookingQuote = {
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  lineItems: {
    code: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }[];
  appliedPromoCode: string | null;
  errors: string[];
};

export type BookingConfirmation = {
  bookingId: string;
  bookingNumber: string;
  status: string;
  currency: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  paymentStatus: string;
};

export type SubmitBooking = () => Promise<void>;

export type BookingState = {
  step: BookingStep;
  catalog: Catalog | null;
  catalogLoading: boolean;
  catalogError: string | null;

  tickets: Record<string, TicketSelection>;
  extras: Record<string, ExtraSelection>;

  booker: BookerDetails;
  promoCode: string;
  appliedPromoCode: string | null;

  quote: BookingQuote | null;
  quoteLoading: boolean;
  quoteError: string | null;

  confirmation: BookingConfirmation | null;
  submitting: boolean;
  submissionError: string | null;
};

export type BookingAction =
  | { type: "CATALOG_LOADING" }
  | { type: "CATALOG_LOADED"; payload: Catalog }
  | { type: "CATALOG_FAILED"; payload: string }
  | {
      type: "TICKET_QUANTITY_CHANGED";
      payload: { code: string; quantity: number };
    }
  | {
      type: "TICKET_DATES_CHANGED";
      payload: { code: string; dates: string[] };
    }
  | {
      type: "ATTENDEES_CHANGED";
      payload: { code: string; attendees: Attendee[] };
    }
  | {
      type: "EXTRA_QUANTITY_CHANGED";
      payload: { code: string; quantity: number };
    }
  | {
      type: "EXTRA_DATES_CHANGED";
      payload: { code: string; dates: string[] };
    }
  | { type: "BOOKER_UPDATED"; payload: Partial<BookerDetails> }
  | { type: "PROMO_CODE_CHANGED"; payload: string }
  | { type: "PROMO_CODE_APPLIED"; payload: string }
  | { type: "QUOTE_RESET" }
  | { type: "QUOTE_LOADING" }
  | { type: "QUOTE_LOADED"; payload: BookingQuote }
  | { type: "QUOTE_FAILED"; payload: string }
  | { type: "STEP_CHANGED"; payload: BookingStep }
  | { type: "SUBMISSION_STARTED" }
  | { type: "BOOKING_CONFIRMED"; payload: BookingConfirmation }
  | { type: "SUBMISSION_FAILED"; payload: string }
  | { type: "RESET_BOOKING" };
