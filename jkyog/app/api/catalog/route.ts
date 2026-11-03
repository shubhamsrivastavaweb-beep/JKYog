import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";

import { db } from "@/src/db";
import { festivalDates } from "@/src/db/schema";
import { loadBookingCatalog } from "@/src/lib/booking/service";

export async function GET() {
  try {
    const catalog = await loadBookingCatalog();

    const dates = await db
      .select({
        date: festivalDates.date,
        label: festivalDates.label,
      })
      .from(festivalDates)
      .where(eq(festivalDates.isActive, true))
      .orderBy(asc(festivalDates.date));

    return NextResponse.json({
      festivalDates: dates,
      tickets: catalog.tickets,
      extras: catalog.extras,
    });
  } catch (error) {
    console.error("Catalog loading failed:", error);

    return NextResponse.json(
      { error: "Unable to load the festival catalog." },
      { status: 500 },
    );
  }
}