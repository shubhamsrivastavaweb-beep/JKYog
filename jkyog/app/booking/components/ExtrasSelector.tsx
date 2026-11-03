
"use client";

import type { Dispatch } from "react";
import type {
  BookingAction,
  Extra,
  ExtraSelection,
  FestivalDate,
} from "../booking-types";

type ExtrasSelectorProps = {
  extras: Extra[];
  festivalDates: FestivalDate[];
  selections: Record<string, ExtraSelection>;
  dispatch: Dispatch<BookingAction>;
};

const WORKSHOP_CODE = "GARBA_WORKSHOP";
const DINNER_CODE = "DINNER_PLATE";

const WORKSHOP_DATES = ["2026-11-11", "2026-11-13"];

export default function ExtrasSelector({
  extras,
  festivalDates,
  selections,
  dispatch,
}: ExtrasSelectorProps) {
  function getSelection(extra: Extra): ExtraSelection {
    return (
      selections[extra.code] ?? {
        code: extra.code,
        quantity: 0,
        dates: [],
      }
    );
  }

  function changeQuantity(extra: Extra, quantity: number) {
    dispatch({
      type: "EXTRA_QUANTITY_CHANGED",
      payload: {
        code: extra.code,
        quantity,
      },
    });
  }

  function toggleDate(extra: Extra, date: string) {
    const selection = getSelection(extra);
    const isSelected = selection.dates.includes(date);

    const dates = isSelected
      ? selection.dates.filter((item) => item !== date)
      : [...selection.dates, date].sort();

    dispatch({
      type: "EXTRA_DATES_CHANGED",
      payload: {
        code: extra.code,
        dates,
      },
    });
  }

  if (extras.length === 0) {
    return null;
  }

  return (
    <section className="extras-section">
      <div className="section-heading">
        <h2>Enhance Your Experience</h2>
        <p>
          Add festival extras to make your Sharad Utsav experience
          even more special.
        </p>
      </div>

      <div className="extras-grid">
        {extras.map((extra) => {
          const selection = getSelection(extra);
          const isWorkshop = extra.code === WORKSHOP_CODE;
          const isDinner = extra.code === DINNER_CODE;
          const isSoldOut =
            !extra.isActive || extra.remainingStock <= 0;

          const availableDates = isWorkshop
            ? festivalDates.filter((date) =>
                WORKSHOP_DATES.includes(date.date)
              )
            : festivalDates;

          return (
            <article className="extra-card" key={extra.code}>
              <div className="extra-card-header">
                <div>
                  <h3>{extra.name}</h3>
                  {extra.description && <p>{extra.description}</p>}
                </div>

                {isSoldOut && (
                  <span className="stock-badge">Sold out</span>
                )}
              </div>

              <p className="extra-price">
                ${(extra.priceCents / 100).toFixed(2)}
                <small>
                  {isDinner
                    ? " / person / day"
                    : extra.code === "DANDIYA_STICKS"
                      ? " / pair"
                      : " / person"}
                </small>
              </p>

              <p className="stock-text">
                {extra.remainingStock} remaining
              </p>

              <div className="quantity-control">
                <span>Quantity</span>

                <div className="quantity-buttons">
                  <button
                    type="button"
                    aria-label={`Decrease ${extra.name} quantity`}
                    disabled={selection.quantity === 0}
                    onClick={() =>
                      changeQuantity(
                        extra,
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
                    aria-label={`Increase ${extra.name} quantity`}
                    disabled={
                      isSoldOut ||
                      selection.quantity >=
                        Math.min(extra.remainingStock, 100)
                    }
                    onClick={() =>
                      changeQuantity(
                        extra,
                        selection.quantity + 1
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </div>

              {selection.quantity > 0 && (isDinner || isWorkshop) && (
                <div className="extra-date-selection">
                  <p>
                    {isWorkshop
                      ? "Choose a workshop date (November 11 or 13)."
                      : "Choose the dates for your dinner plates."}
                  </p>

                  <div className="date-options">
                    {availableDates.map((festivalDate) => {
                      const checked = selection.dates.includes(
                        festivalDate.date
                      );

                      return (
                        <label
                          className={`date-option ${
                            checked ? "selected" : ""
                          }`}
                          key={festivalDate.date}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              toggleDate(extra, festivalDate.date)
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
