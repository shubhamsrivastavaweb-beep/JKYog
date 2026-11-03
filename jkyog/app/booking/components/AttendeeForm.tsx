"use client";

import type { Dispatch } from "react";

import type {
  Attendee,
  BookingAction,
  Ticket,
  TicketSelection,
} from "../booking-types";

type AttendeeFormProps = {
  tickets: Ticket[];
  selections: Record<string, TicketSelection>;
  dispatch: Dispatch<BookingAction>;
};

function getAttendeeLabel(
  ticketCode: string,
  index: number
): string {
  if (ticketCode === "FAMILY_PASS") {
    const position = index % 4;

    if (position < 2) {
      return `Adult ${position + 1}`;
    }

    return `Child ${position - 1}`;
  }

  return `Attendee ${index + 1}`;
}

// Calculate age on a specific date using local calendar dates.
function calculateAge(
  dateOfBirth: string,
  festivalDate: string
): number {
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  const admission = new Date(`${festivalDate}T00:00:00`);

  let age = admission.getFullYear() - birth.getFullYear();

  const birthdayHasNotOccurred =
    admission.getMonth() < birth.getMonth() ||
    (admission.getMonth() === birth.getMonth() &&
      admission.getDate() < birth.getDate());

  if (birthdayHasNotOccurred) {
    age--;
  }

  return age;
}

function getAttendeeAgeError(
  ticket: Ticket,
  attendee: Attendee,
  index: number,
  selectedDates: string[]
): string | null {
  if (!attendee.dateOfBirth || selectedDates.length === 0) {
    return null;
  }

  for (const date of selectedDates) {
    const age = calculateAge(attendee.dateOfBirth, date);

    if (age < 0) {
      return "Date of birth cannot be after the admission date.";
    }

    if (age < 5) {
      return "Children under 5 do not require a paid ticket.";
    }

    if (ticket.code === "FAMILY_PASS") {
      const position = index % 4;

      if (position < 2 && age < 12) {
        return "Family Pass adult attendees must be at least 12 years old.";
      }

      if (position >= 2 && (age < 5 || age > 11)) {
        return "Family Pass child attendees must be between 5 and 11 years old.";
      }

      continue;
    }

    if (ticket.minAge !== null && age < ticket.minAge) {
      return `This ticket requires attendees to be at least ${ticket.minAge} years old.`;
    }

    if (ticket.maxAge !== null && age > ticket.maxAge) {
      return `This ticket is only valid for attendees up to ${ticket.maxAge} years old.`;
    }
  }

  return null;
}

export default function AttendeeForm({
  tickets,
  selections,
  dispatch,
}: AttendeeFormProps) {
  const selectedTickets = tickets.filter(
    (ticket) => (selections[ticket.code]?.quantity ?? 0) > 0
  );

  function updateAttendee(
    code: string,
    index: number,
    field: keyof Attendee,
    value: string
  ) {
    const current = selections[code];

    if (!current) return;

    const attendees = current.attendees.map((attendee, i) =>
      i === index
        ? { ...attendee, [field]: value }
        : attendee
    );

    dispatch({
      type: "ATTENDEES_CHANGED",
      payload: { code, attendees },
    });
  }

  if (selectedTickets.length === 0) {
    return null;
  }

  return (
    <section className="attendee-section">
      <div className="section-heading">
        <h2>Attendee Details</h2>
        <p>
          Enter the details of everyone attending the festival.
        </p>
      </div>

      {selectedTickets.map((ticket) => {
        const selection = selections[ticket.code];

        return (
          <div className="attendee-ticket-group" key={ticket.code}>
            <h3>{ticket.name}</h3>

            {selection.attendees.map((attendee, index) => {
              const label = getAttendeeLabel(ticket.code, index);

              const ageError = getAttendeeAgeError(
                ticket,
                attendee,
                index,
                selection.dates
              );

              return (
                <div
                  className="attendee-card"
                  key={`${ticket.code}-${index}`}
                >
                  <h4>{label}</h4>

                  <div className="attendee-fields">
                    <label>
                      First name
                      <input
                        type="text"
                        value={attendee.firstName}
                        maxLength={80}
                        onChange={(event) =>
                          updateAttendee(
                            ticket.code,
                            index,
                            "firstName",
                            event.target.value
                          )
                        }
                        placeholder="First name"
                      />
                    </label>

                    <label>
                      Last name
                      <input
                        type="text"
                        value={attendee.lastName}
                        maxLength={80}
                        onChange={(event) =>
                          updateAttendee(
                            ticket.code,
                            index,
                            "lastName",
                            event.target.value
                          )
                        }
                        placeholder="Last name"
                      />
                    </label>

                    <label>
                      Date of birth
                      <input
                        type="date"
                        value={attendee.dateOfBirth}
                        max={
                          selection.dates.length > 0
                            ? [...selection.dates].sort()[0]
                            : undefined
                        }
                        aria-invalid={Boolean(ageError)}
                        aria-describedby={
                          ageError
                            ? `age-error-${ticket.code}-${index}`
                            : undefined
                        }
                        onChange={(event) =>
                          updateAttendee(
                            ticket.code,
                            index,
                            "dateOfBirth",
                            event.target.value
                          )
                        }
                      />

                      {ageError && (
                        <p
                          id={`age-error-${ticket.code}-${index}`}
                          className="field-error"
                          role="alert"
                        >
                          {ageError}
                        </p>
                      )}
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}