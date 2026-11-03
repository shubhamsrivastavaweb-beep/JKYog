
import type {
  Attendee,
  BookingAction,
  BookingState,
  TicketSelection,
  ExtraSelection,
} from "./booking-types";

export const initialBookingState: BookingState = {
  step: "tickets",
  catalog: null,
  catalogLoading: true,
  catalogError: null,

  tickets: {},
  extras: {},

  booker: {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
  },

  promoCode: "",

  quote: null,
  quoteLoading: false,
  quoteError: null,

  confirmation: null,
  submitting: false,
  submissionError: null,
};

function updateTicket(
  state: BookingState,
  code: string,
  changes: Partial<TicketSelection>
): Record<string, TicketSelection> {
  const current = state.tickets[code] ?? {
    code,
    quantity: 0,
    dates: [],
    attendees: [],
  };

  return {
    ...state.tickets,
    [code]: {
      ...current,
      ...changes,
    },
  };
}

function updateExtra(
  state: BookingState,
  code: string,
  changes: Partial<ExtraSelection>
): Record<string, ExtraSelection> {
  const current = state.extras[code] ?? {
    code,
    quantity: 0,
    dates: [],
  };

  return {
    ...state.extras,
    [code]: {
      ...current,
      ...changes,
    },
  };
}

function createEmptyAttendees(count: number): Attendee[] {
  return Array.from({ length: count }, () => ({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
  }));
}

export function bookingReducer(
  state: BookingState,
  action: BookingAction
): BookingState {
  switch (action.type) {
    case "CATALOG_LOADING":
      return {
        ...state,
        catalogLoading: true,
        catalogError: null,
      };

    case "CATALOG_LOADED":
      return {
        ...state,
        catalog: action.payload,
        catalogLoading: false,
        catalogError: null,
      };

    case "CATALOG_FAILED":
      return {
        ...state,
        catalogLoading: false,
        catalogError: action.payload,
      };

    case "TICKET_QUANTITY_CHANGED": {
    const { code, quantity } = action.payload;

    const attendeeCount =
        code === "FAMILY_PASS" ? quantity * 4 : quantity;

    const currentAttendees =
        state.tickets[code]?.attendees ?? [];

    const attendees = [
        ...currentAttendees.slice(0, attendeeCount),
        ...createEmptyAttendees(
        Math.max(0, attendeeCount - currentAttendees.length)
        ),
    ];

    const updatedTickets = updateTicket(state, code, {
        quantity,
        attendees,
        ...(quantity === 0 ? { dates: [] } : {}),
    });

    return {
        ...state,
        tickets: updatedTickets,
        quote: null,
        quoteError: null,
    };
    }

    case "TICKET_DATES_CHANGED": {
    const { code, dates } = action.payload;

    return {
        ...state,
        tickets: updateTicket(state, code, { dates }),
        quote: null,
        quoteError: null,
    };
    }

    case "ATTENDEES_CHANGED": {
    const { code, attendees } = action.payload;

    return {
        ...state,
        tickets: updateTicket(state, code, { attendees }),
    };
    }

    case "EXTRA_QUANTITY_CHANGED": {
    const { code, quantity } = action.payload;

    return {
        ...state,
        extras: updateExtra(state, code, {
        quantity,
        ...(quantity === 0 ? { dates: [] } : {}),
        }),
        quote: null,
        quoteError: null,
    };
    }

    case "EXTRA_DATES_CHANGED": {
    const { code, dates } = action.payload;

    return {
        ...state,
        extras: updateExtra(state, code, { dates }),
        quote: null,
        quoteError: null,
    };
    }

    case "BOOKER_UPDATED":
      return {
        ...state,
        booker: {
          ...state.booker,
          ...action.payload,
        },
      };

    case "PROMO_CODE_CHANGED":
      return {
        ...state,
        promoCode: action.payload,
        quote: null,
        quoteError: null,
      };

    case "QUOTE_LOADING":
      return {
        ...state,
        quoteLoading: true,
        quoteError: null,
      };

    case "QUOTE_LOADED":
      return {
        ...state,
        quote: action.payload,
        quoteLoading: false,
        quoteError: null,
      };

    case "QUOTE_FAILED":
      return {
        ...state,
        quote: null,
        quoteLoading: false,
        quoteError: action.payload,
      };

    case "STEP_CHANGED":
      return {
        ...state,
        step: action.payload,
        submissionError: null,
      };

    case "SUBMISSION_STARTED":
      return {
        ...state,
        submitting: true,
        submissionError: null,
      };

    case "BOOKING_CONFIRMED":
      return {
        ...state,
        submitting: false,
        confirmation: action.payload,
        step: "confirmation",
      };

    case "SUBMISSION_FAILED":
      return {
        ...state,
        submitting: false,
        submissionError: action.payload,
      };

    default:
      return state;
  }
}
