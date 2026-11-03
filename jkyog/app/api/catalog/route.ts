import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";

import { db } from "@/src/db";
import { festivalDates } from "@/src/db/schema";
import { loadBookingCatalog } from "@/src/lib/booking/service";

export async function GET() {
  try {
    console.time("Catalog: load tickets and extras");

    const catalog = await loadBookingCatalog();

    console.timeEnd("Catalog: load tickets and extras");

    console.time("Catalog: load festival dates");

    const dates = await db
      .select({
        date: festivalDates.date,
        label: festivalDates.label,
      })
      .from(festivalDates)
      .where(eq(festivalDates.isActive, true))
      .orderBy(asc(festivalDates.date));

    console.timeEnd("Catalog: load festival dates");

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