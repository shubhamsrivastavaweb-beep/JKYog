
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

  return "Attendee";
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

              return (
                <div
                  className="attendee-card"
                  key={`${ticket.code}-${index}`}
                >
                  <h4>
                    {label} {index + 1}
                  </h4>

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
                        max="2026-11-10"
                        onChange={(event) =>
                          updateAttendee(
                            ticket.code,
                            index,
                            "dateOfBirth",
                            event.target.value
                          )
                        }
                      />
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
