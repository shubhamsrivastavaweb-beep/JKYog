"use client";

import type { Dispatch } from "react";

import type {
  BookerDetails,
  BookingAction,
} from "../booking-types";

type BookerFormProps = {
  booker: BookerDetails;
  dispatch: Dispatch<BookingAction>;
};

const LATEST_ELIGIBLE_DOB = "2008-11-10";

export default function BookerForm({
  booker,
  dispatch,
}: BookerFormProps) {
  const isUnderage =
    booker.dateOfBirth !== "" &&
    booker.dateOfBirth > LATEST_ELIGIBLE_DOB;

  function updateField(
    field: keyof BookerDetails,
    value: string
  ) {
    dispatch({
      type: "BOOKER_UPDATED",
      payload: { [field]: value },
    });
  }

  return (
    <section className="attendee-section">
      <div className="section-heading">
        <h2>Booker Details</h2>
        <p>
          Enter the details of the person responsible for this booking.
        </p>
      </div>

      <div className="attendee-ticket-group">
        <div className="attendee-card">
          <div className="attendee-fields">
            <label>
              First name
              <input
                type="text"
                value={booker.firstName}
                maxLength={80}
                required
                autoComplete="given-name"
                onChange={(event) =>
                  updateField("firstName", event.target.value)
                }
                placeholder="First name"
              />
            </label>

            <label>
              Last name
              <input
                type="text"
                value={booker.lastName}
                maxLength={80}
                required
                autoComplete="family-name"
                onChange={(event) =>
                  updateField("lastName", event.target.value)
                }
                placeholder="Last name"
              />
            </label>

            <label>
              Email address
              <input
                type="email"
                value={booker.email}
                maxLength={254}
                required
                autoComplete="email"
                onChange={(event) =>
                  updateField("email", event.target.value)
                }
                placeholder="you@example.com"
              />
            </label>

            <label>
              Phone number
              <input
                type="tel"
                value={booker.phone}
                maxLength={20}
                required
                autoComplete="tel"
                onChange={(event) =>
                  updateField("phone", event.target.value)
                }
                placeholder="Phone number"
              />
            </label>

            <label>
              Date of birth
              <input
                type="date"
                value={booker.dateOfBirth}
                max={LATEST_ELIGIBLE_DOB}
                required
                autoComplete="bday"
                aria-invalid={isUnderage}
                aria-describedby={
                  isUnderage ? "booker-age-error" : undefined
                }
                onChange={(event) =>
                  updateField("dateOfBirth", event.target.value)
                }
              />

              {isUnderage && (
                <p
                  id="booker-age-error"
                  className="field-error"
                  role="alert"
                >
                  The person booking must be at least 18 years old
                  on November 10, 2026.
                </p>
              )}
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}