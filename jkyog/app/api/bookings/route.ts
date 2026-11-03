import { NextRequest, NextResponse } from "next/server";

import { createBooking } from "@/src/lib/booking/service";
import { BookingServiceError } from "@/src/lib/booking/errors";

export async function POST(request: NextRequest) {
  let body: unknown;

  // Parse incoming JSON.
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 },
    );
  }

  try {
    const booking = await createBooking(body);

    return NextResponse.json(
      {
        message: "Booking created successfully.",
        booking,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof BookingServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    console.error("Booking creation failed:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while creating the booking." },
      { status: 500 },
    );
  }
}