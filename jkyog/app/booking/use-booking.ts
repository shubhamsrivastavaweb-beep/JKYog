"use client";

import { useEffect, useReducer, useRef } from "react";

import {
  bookingReducer,
  initialBookingState,
} from "./booking-reducer";

import type {
  BookingQuote,
  BookingConfirmation,
  Catalog,
  SubmitBooking,
} from "./booking-types";

export function useBooking() {
  const [state, dispatch] = useReducer(
    bookingReducer,
    initialBookingState
  );

  // Prevent duplicate submissions.
  const submissionLock = useRef(false);

  // Reuse the same key when retrying an uncertain request.
  const idempotencyKey = useRef<string | null>(null);

  // Submit the booking to the backend.
  const submitBooking: SubmitBooking = async () => {
    if (submissionLock.current || state.submitting) {
      return;
    }

    submissionLock.current = true;

    if (!idempotencyKey.current) {
      idempotencyKey.current = crypto.randomUUID();
    }

    dispatch({ type: "SUBMISSION_STARTED" });

    try {
      const selectedTickets = Object.values(state.tickets)
        .filter((ticket) => ticket.quantity > 0)
        .map((ticket) => ({
          code: ticket.code,
          quantity: ticket.quantity,
          dates: ticket.dates,
          attendees: ticket.attendees,
        }));

      const selectedExtras = Object.values(state.extras)
        .filter((extra) => extra.quantity > 0)
        .map((extra) => ({
          code: extra.code,
          quantity: extra.quantity,
          ...(extra.dates.length > 0
            ? { dates: extra.dates }
            : {}),
        }));

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          booker: state.booker,
          tickets: selectedTickets,
          extras: selectedExtras,
          promoCode: state.promoCode.trim() || undefined,
          idempotencyKey: idempotencyKey.current,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? "Unable to complete your booking."
        );
      }

      const confirmation: BookingConfirmation = result.booking;

      dispatch({
        type: "BOOKING_CONFIRMED",
        payload: confirmation,
      });

      // A successful booking is complete.
      idempotencyKey.current = null;
    } catch (error) {
      dispatch({
        type: "SUBMISSION_FAILED",
        payload:
          error instanceof Error
            ? error.message
            : "Something went wrong while creating your booking.",
      });
    } finally {
      submissionLock.current = false;
    }
  };

  // Build stable quote keys from price-affecting selections only.
  // Attendee name and DOB changes will not trigger quote requests.
  const ticketQuoteKey = JSON.stringify(
    Object.values(state.tickets)
      .filter((ticket) => ticket.quantity > 0)
      .map(({ code, quantity, dates }) => ({
        code,
        quantity,
        dates,
      }))
  );

  const extraQuoteKey = JSON.stringify(
    Object.values(state.extras)
      .filter((extra) => extra.quantity > 0)
      .map(({ code, quantity, dates }) => ({
        code,
        quantity,
        dates,
      }))
  );

  // Load the festival catalog once.
  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalog() {
      dispatch({ type: "CATALOG_LOADING" });

      try {
        const response = await fetch("/api/catalog", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to load festival tickets.");
        }

        const catalog: Catalog = await response.json();

        dispatch({
          type: "CATALOG_LOADED",
          payload: catalog,
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === "AbortError"
        ) {
          return;
        }

        dispatch({
          type: "CATALOG_FAILED",
          payload:
            error instanceof Error
              ? error.message
              : "Something went wrong while loading the catalog.",
        });
      }
    }

    loadCatalog();

    return () => controller.abort();
  }, []);

  // Automatically calculate the booking quote.
  useEffect(() => {
    const catalog = state.catalog;

    if (!catalog) {
      return;
    }

    const selectedTickets = Object.values(state.tickets).filter(
      (ticket) => ticket.quantity > 0
    );

    const selectedExtras = Object.values(state.extras).filter(
      (extra) => extra.quantity > 0
    );

    // A booking quote requires at least one ticket.
    if (selectedTickets.length === 0) {
      dispatch({ type: "QUOTE_RESET" });
      return;
    }

    // Do not request a quote while ticket dates are incomplete.
    const ticketsReady = selectedTickets.every((selection) => {
      const ticket = catalog.tickets.find(
        (item) => item.code === selection.code
      );

      if (!ticket || selection.dates.length === 0) {
        return false;
      }

      if (
        ticket.pricingModel === "flat" &&
        selection.dates.length !== ticket.admissionDays
      ) {
        return false;
      }

      if (
        selection.code === "FAMILY_PASS" &&
        selection.dates.length !== 1
      ) {
        return false;
      }

      return true;
    });

    if (!ticketsReady) {
      dispatch({ type: "QUOTE_RESET" });
      return;
    }

    // Date-restricted extras must have dates before quoting.
    const extrasReady = selectedExtras.every((selection) => {
      if (
        selection.code === "DINNER_PLATE" ||
        selection.code === "GARBA_WORKSHOP"
      ) {
        return selection.dates.length > 0;
      }

      return true;
    });

    if (!extrasReady) {
      dispatch({ type: "QUOTE_RESET" });
      return;
    }

    const controller = new AbortController();

    // Remove the previous quote immediately.
    dispatch({ type: "QUOTE_RESET" });

    // Debounce requests while the user changes selections.
    const timeoutId = window.setTimeout(async () => {
      dispatch({ type: "QUOTE_LOADING" });

      try {
        const response = await fetch("/api/bookings/quote", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            tickets: selectedTickets.map((ticket) => ({
              code: ticket.code,
              quantity: ticket.quantity,
              dates: ticket.dates,
            })),

            extras: selectedExtras.map((extra) => ({
              code: extra.code,
              quantity: extra.quantity,
              ...(extra.dates.length > 0
                ? { dates: extra.dates }
                : {}),
            })),

            promoCode: state.promoCode.trim() || undefined,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Unable to calculate your booking total."
          );
        }

        const quote: BookingQuote = result.pricing;

        dispatch({
          type: "QUOTE_LOADED",
          payload: quote,
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === "AbortError"
        ) {
          return;
        }

        dispatch({
          type: "QUOTE_FAILED",
          payload:
            error instanceof Error
              ? error.message
              : "Unable to calculate your booking total.",
        });
      }
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    state.catalog,
    ticketQuoteKey,
    extraQuoteKey,
    state.promoCode,
  ]);

  return {
    state,
    dispatch,
    submitBooking,
  };
}