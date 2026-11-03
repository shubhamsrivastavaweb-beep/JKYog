"use client";

import type {
  BookingAction,
  BookingConfirmation as BookingConfirmationData,
} from "../booking-types";

import { formatCurrency } from "../format-currency";

type BookingConfirmationProps = {
  confirmation: BookingConfirmationData;
  dispatch: React.Dispatch<BookingAction>;
};

export default function BookingConfirmation({
  confirmation,
  dispatch,
}: BookingConfirmationProps) {
  return (
    <main className="booking-page">
      <div className="page-container">
        <section className="booking-confirmation-card">
          <div className="confirmation-icon" aria-hidden="true">
            ✓
          </div>

          <p className="festival-eyebrow">SHARAD UTSAV 2026</p>

          <h1>Booking Confirmed!</h1>

          <p className="confirmation-message">
            Thank you for booking. Your tickets have been reserved
            successfully.
          </p>

          <div className="confirmation-booking-number">
            <span>Booking Number</span>
            <strong>{confirmation.bookingNumber}</strong>
          </div>

          <div className="confirmation-details">
            <div>
              <span>Booking Status</span>
              <strong>{confirmation.status}</strong>
            </div>

            <div>
              <span>Payment Status</span>
              <strong>{confirmation.paymentStatus}</strong>
            </div>

            <div>
              <span>Subtotal</span>
              <strong>
                {formatCurrency(confirmation.subtotalCents)}
              </strong>
            </div>

            <div>
              <span>Discount</span>
              <strong>
                −{formatCurrency(confirmation.discountCents)}
              </strong>
            </div>

            <div className="confirmation-total">
              <span>Total Paid</span>
              <strong>
                {formatCurrency(confirmation.totalCents)}
              </strong>
            </div>
          </div>

          <p className="confirmation-footer">
            We look forward to celebrating with you!
          </p>

          <button
            type="button"
            className="back-to-booking-button"
            onClick={() => dispatch({ type: "RESET_BOOKING" })}
          >
            ← Back to Booking
          </button>
        </section>
      </div>
    </main>
  );
}