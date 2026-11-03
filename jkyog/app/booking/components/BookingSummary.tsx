"use client";

import type { Dispatch } from "react";

import type {
  BookingAction,
  BookingState,
  SubmitBooking,
} from "../booking-types";

import { formatCurrency } from "../format-currency";
import { validateBookingForm } from "../booking-validation";

type BookingSummaryProps = {
  state: BookingState;
  dispatch: Dispatch<BookingAction>;
  submitBooking: SubmitBooking;
};

export default function BookingSummary({
  state,
  dispatch,
  submitBooking
}: BookingSummaryProps) {
  const catalog = state.catalog;

  if (!catalog) {
    return null;
  }

  const selectedTickets = Object.values(state.tickets).filter(
    (ticket) => ticket.quantity > 0
  );

  const selectedExtras = Object.values(state.extras).filter(
    (extra) => extra.quantity > 0
  );

  const hasSelection = selectedTickets.length > 0;

  const validationErrors = validateBookingForm(state);
  const isBookingReady = validationErrors.length === 0;

  function getDateLabels(dates: string[]) {
    return dates
      .map(
        (date) =>
          catalog?.festivalDates.find((item) => item.date === date)
            ?.label ?? date
      )
      .join(", ");
  }

  return (
    <section className="booking-summary-section">
      <div className="section-heading">
        <h2>Booking Summary</h2>
        <p>Review your selections and apply a promo code.</p>
      </div>

      <div className="booking-summary-card">
        {!hasSelection ? (
          <p className="summary-empty">
            Select at least one ticket to see your booking summary.
          </p>
        ) : (
          <>
            <div className="summary-items">
              {selectedTickets.map((selection) => {
                const ticket = catalog.tickets.find(
                  (item) => item.code === selection.code
                );

                if (!ticket) return null;

                return (
                  <div
                    className="summary-item"
                    key={selection.code}
                  >
                    <div>
                      <h3>{ticket.name}</h3>
                      <p>Quantity: {selection.quantity}</p>
                      <p>
                        {selection.dates.length > 0
                          ? getDateLabels(selection.dates)
                          : "Select admission dates"}
                      </p>
                    </div>
                  </div>
                );
              })}

              {selectedExtras.map((selection) => {
                const extra = catalog.extras.find(
                  (item) => item.code === selection.code
                );

                if (!extra) return null;

                return (
                  <div
                    className="summary-item"
                    key={selection.code}
                  >
                    <div>
                      <h3>{extra.name}</h3>
                      <p>Quantity: {selection.quantity}</p>

                      {selection.dates.length > 0 && (
                        <p>{getDateLabels(selection.dates)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="promo-section">
              <label htmlFor="promo-code">Promo code</label>

              <div className="promo-input-row">
                <input
                  id="promo-code"
                  type="text"
                  value={state.promoCode}
                  maxLength={40}
                  placeholder="Enter promo code"
                  onChange={(event) =>
                    dispatch({
                      type: "PROMO_CODE_CHANGED",
                      payload: event.target.value,
                    })
                  }
                />
              </div>

              <p className="promo-hint">
                Available codes include SEVA10, FLAT20 and KIDSFREE.
              </p>
            </div>

            <div
              className="booking-validation"
              aria-live="polite"
            >
              {validationErrors.length > 0 ? (
                <>
                  <h3>Please complete the following:</h3>

                  <ul>
                    {validationErrors.map((error, index) => (
                      <li key={`${index}-${error}`}>
                        {error}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="validation-success">
                  Your booking details look good. You can proceed.
                </p>
              )}
            </div>

            <div className="summary-totals" aria-live="polite">
              {state.quoteLoading && (
                <p className="quote-status">
                  Calculating your total...
                </p>
              )}

              {state.quoteError && (
                <p className="error-message" role="alert">
                  {state.quoteError}
                </p>
              )}

              {state.quote && (
                <>
                  <div className="summary-total-row">
                    <span>Subtotal</span>
                    <strong>
                      {formatCurrency(state.quote.subtotalCents)}
                    </strong>
                  </div>

                  {state.quote.discountCents > 0 && (
                    <div className="summary-total-row discount-row">
                      <span>
                        Discount
                        {state.quote.appliedPromoCode
                          ? ` (${state.quote.appliedPromoCode})`
                          : ""}
                      </span>

                      <strong>
                        −{formatCurrency(state.quote.discountCents)}
                      </strong>
                    </div>
                  )}

                  <div className="summary-grand-total">
                    <span>Total</span>
                    <strong>
                      {formatCurrency(state.quote.totalCents)}
                    </strong>
                  </div>
                </>
              )}
            </div>
            {state.submissionError && (
              <p className="error-message" role="alert">
                {state.submissionError}
              </p>
            )}

            <button
              className="primary-button"
              type="button"
              disabled={
                state.submitting ||
                state.quoteLoading ||
                !state.quote ||
                Boolean(state.quoteError) ||
                !isBookingReady
              }
              onClick={() => void submitBooking()}
            >
              {state.submitting ? "Processing..." : "Book Now"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}