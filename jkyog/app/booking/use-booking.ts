
"use client";

import { useEffect, useReducer } from "react";
import {
  bookingReducer,
  initialBookingState,
} from "./booking-reducer";
import type { Catalog } from "./booking-types";

export function useBooking() {
  const [state, dispatch] = useReducer(
    bookingReducer,
    initialBookingState
  );

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
        if (error instanceof Error && error.name === "AbortError") {
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

  return { state, dispatch };
}
