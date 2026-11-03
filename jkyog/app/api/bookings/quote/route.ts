import { NextRequest, NextResponse } from "next/server";

import { quoteBooking } from "@/src/lib/booking/service";
import { BookingServiceError } from "@/src/lib/booking/errors";
import { quoteBookingSchema } from "@/src/lib/booking/request-schema";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 },
    );
  }

  const parsed = quoteBookingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues
          .map((issue) => issue.message)
          .join(". "),
      },
      { status: 400 },
    );
  }

  try {
    const quote = await quoteBooking(parsed.data);

    return NextResponse.json(quote, { status: 200 });
  } catch (error) {
    if (error instanceof BookingServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    console.error("Booking quote failed:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while calculating the quote." },
      { status: 500 },
    );
  }
}