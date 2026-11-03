
"use client";

import type { Dispatch } from "react";
import type {
  BookingAction,
  FestivalDate,
  Ticket,
  TicketSelection,
} from "../booking-types";

type TicketSelectorProps = {
  tickets: Ticket[];
  festivalDates: FestivalDate[];
  selections: Record<string, TicketSelection>;
  dispatch: Dispatch<BookingAction>;
};

const ALL_DAYS_CODE = "ALL_DAYS_ADULT";
const FAMILY_PASS_CODE = "FAMILY_PASS";

export default function TicketSelector({
  tickets,
  festivalDates,
  selections,
  dispatch,
}: TicketSelectorProps) {
  function getSelection(ticket: Ticket): TicketSelection {
    return (
      selections[ticket.code] ?? {
        code: ticket.code,
        quantity: 0,
        dates: [],
        attendees: [],
      }
    );
  }

  function changeQuantity(ticket: Ticket, quantity: number) {
    const dates =
      ticket.code === ALL_DAYS_CODE ||
      ticket.code === "ALL_DAYS_CHILD"
        ? festivalDates.map((item) => item.date)
        : quantity === 0
          ? []
          : getSelection(ticket).dates;

    dispatch({
      type: "TICKET_QUANTITY_CHANGED",
      payload: {
        code: ticket.code,
        quantity,
      },
    });

    if (quantity > 0 && dates.length > 0) {
      dispatch({
        type: "TICKET_DATES_CHANGED",
        payload: {
          code: ticket.code,
          dates,
        },
      });
    }
  }

  function toggleDate(ticket: Ticket, date: string) {
    const selection = getSelection(ticket);
    const currentlySelected = selection.dates.includes(date);

    let dates: string[];

    if (ticket.code === FAMILY_PASS_CODE) {
      dates = currentlySelected ? [] : [date];
    } else {
      dates = currentlySelected
        ? selection.dates.filter((selected) => selected !== date)
        : [...selection.dates, date].sort();
    }

    dispatch({
      type: "TICKET_DATES_CHANGED",
      payload: {
        code: ticket.code,
        dates,
      },
    });
  }

  if (tickets.length === 0) {
    return <p>No tickets are currently available.</p>;
  }

  return (
    <section className="ticket-selector" aria-labelledby="ticket-heading">
      <div className="section-heading">
        <h2 id="ticket-heading">Choose Your Tickets</h2>
        <p>Select your ticket type, quantity and festival dates.</p>
      </div>

      <div className="ticket-grid">
        {tickets.map((ticket) => {
          const selection = getSelection(ticket);
          const isAllDays =
            ticket.code === ALL_DAYS_CODE ||
            ticket.code === "ALL_DAYS_CHILD";
          const isFamilyPass = ticket.code === FAMILY_PASS_CODE;
          const isSoldOut =
            !ticket.isActive || ticket.remainingStock <= 0;

          return (
            <article className="ticket-card" key={ticket.code}>
              <div className="ticket-card-header">
                <div>
                  <h3>{ticket.name}</h3>
                  {ticket.description && (
                    <p>{ticket.description}</p>
                  )}
                </div>

                {isSoldOut && (
                  <span className="stock-badge">Sold out</span>
                )}
              </div>

              <p className="ticket-price">
                ${(ticket.priceCents / 100).toFixed(2)}
                <span>
                  {ticket.code === "FAMILY_PASS"
                    ? " / family / day"
                    : ticket.pricingModel === "per_day"
                        ? " / person / day"
                        : " / pass"}
                </span>
              </p>

              <p className="stock-text">
                {ticket.remainingStock} tickets remaining
              </p>

              <div className="quantity-control">
                <span>Quantity</span>

                <div className="quantity-buttons">
                  <button
                    type="button"
                    aria-label={`Decrease ${ticket.name} quantity`}
                    disabled={selection.quantity === 0}
                    onClick={() =>
                      changeQuantity(
                        ticket,
                        Math.max(0, selection.quantity - 1)
                      )
                    }
                  >
                    −
                  </button>

                  <output aria-live="polite">
                    {selection.quantity}
                  </output>

                  <button
                    type="button"
                    aria-label={`Increase ${ticket.name} quantity`}
                    disabled={
                      isSoldOut ||
                      selection.quantity >=
                        Math.min(ticket.remainingStock, 20)
                    }
                    onClick={() =>
                      changeQuantity(
                        ticket,
                        selection.quantity + 1
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </div>

              {selection.quantity > 0 && (
                <div className="date-selection">
                  <p>
                    {isAllDays
                      ? "Admission includes all five festival days."
                      : isFamilyPass
                        ? "Choose one festival day."
                        : "Choose your festival dates."}
                  </p>

                  <div className="date-options">
                    {festivalDates.map((festivalDate) => {
                      const checked = selection.dates.includes(
                        festivalDate.date
                      );

                      return (
                        <label
                          className={`date-option ${
                            checked ? "selected" : ""
                          } ${isAllDays ? "locked" : ""}`}
                          key={festivalDate.date}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isAllDays}
                            onChange={() =>
                              toggleDate(ticket, festivalDate.date)
                            }
                          />
                          <span>{festivalDate.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
