"use client";

import { useBooking } from "./booking/use-booking";
import TicketSelector from "./booking/components/TicketSelector";
import AttendeeForm from "./booking/components/AttendeeForm";
import ExtrasSelector from "./booking/components/ExtrasSelector";
import BookingSummary from "./booking/components/BookingSummary";
import BookerForm from "./booking/components/BookerForm";
import BookingConfirmation from "./booking/components/BookingConfirmation";

export default function Home() {
  const { state, dispatch, submitBooking } = useBooking();

  if (state.catalogLoading) {
    return (
      <main className="booking-page">
        <div className="page-container">
          <p className="loading-message">
            Loading Sharad Utsav 2026...
          </p>
        </div>
      </main>
    );
  }
  // Show confirmation independently of catalog state.
  if (state.step === "confirmation" && state.confirmation) {
    return (
      <BookingConfirmation confirmation={state.confirmation} dispatch={dispatch} />
    );
  }

  if (state.catalogError || !state.catalog) {
    return (
      <main className="booking-page">
        <div className="page-container">
          <p className="error-message" role="alert">
            {state.catalogError ??
              "Unable to load festival tickets. Please try again."}
          </p>
          <button
            className="primary-button"
            type="button"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="booking-page">
      <div className="page-container">
        <header className="festival-header">
          <p className="festival-eyebrow">
            RADHA KRISHNA TEMPLE PRESENTS
          </p>
          <h1>Sharad Utsav 2026</h1>
          <p className="festival-subtitle">
            Celebrate devotion, culture, music and togetherness.
          </p>
          <p className="festival-details">
            November 10–14, 2026
            <span aria-hidden="true"> • </span>
            Radha Krishna Temple, Allen, Texas
          </p>
        </header>

        <TicketSelector
          tickets={state.catalog.tickets}
          festivalDates={state.catalog.festivalDates}
          selections={state.tickets}
          dispatch={dispatch}
        />

        <AttendeeForm
          tickets={state.catalog.tickets}
          selections={state.tickets}
          dispatch={dispatch}
        />

        <BookerForm
          booker={state.booker}
          dispatch={dispatch}
        />

        <ExtrasSelector
          extras={state.catalog.extras}
          festivalDates={state.catalog.festivalDates}
          selections={state.extras}
          dispatch={dispatch}
        />

        <BookingSummary
          state={state}
          dispatch={dispatch}
          submitBooking={submitBooking}
        />
      </div>
    </main>
  );
}