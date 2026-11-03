import {
  pgEnum,
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";


/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending_payment",
  "confirmed",
  "failed",
  "cancelled",
  "expired",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "succeeded",
  "failed",
  "refunded",
]);

export const discountTypeEnum = pgEnum("discount_type", [
  "percentage",
  "fixed_amount",
  "free_children",
]);

export const bookingItemTypeEnum = pgEnum("booking_item_type", [
  "ticket",
  "extra",
]);

/* -------------------------------------------------------------------------- */
/* Festival dates                                                             */
/* -------------------------------------------------------------------------- */

export const festivalDates = pgTable(
  "festival_dates",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    date: date("date").notNull().unique(),

    label: varchar("label", { length: 100 }).notNull(),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
);

/* -------------------------------------------------------------------------- */
/* Ticket types                                                               */
/* -------------------------------------------------------------------------- */

export const ticketTypes = pgTable(
  "ticket_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    code: varchar("code", { length: 50 }).notNull().unique(),

    name: varchar("name", { length: 150 }).notNull(),

    description: text("description"),

    priceCents: integer("price_cents").notNull(),

    totalStock: integer("total_stock").notNull(),

    remainingStock: integer("remaining_stock").notNull(),

    pricingModel: varchar("pricing_model", {
      length: 30,
    }).notNull(),

    minAge: integer("min_age"),

    maxAge: integer("max_age"),

    admissionDays: integer("admission_days").notNull().default(1),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "ticket_types_price_nonnegative",
      sql`${table.priceCents} >= 0`,
    ),
    check(
      "ticket_types_stock_valid",
      sql`${table.totalStock} >= 0 AND ${table.remainingStock} >= 0 AND ${table.remainingStock} <= ${table.totalStock}`,
    ),
    check(
      "ticket_types_age_valid",
      sql`(${table.minAge} IS NULL OR ${table.minAge} >= 0)
        AND (${table.maxAge} IS NULL OR ${table.maxAge} >= 0)
        AND (${table.minAge} IS NULL OR ${table.maxAge} IS NULL OR ${table.minAge} <= ${table.maxAge})`,
    ),
    check(
      "ticket_types_admission_days_positive",
      sql`${table.admissionDays} > 0`,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/* Extras                                                                     */
/* -------------------------------------------------------------------------- */

export const extras = pgTable(
  "extras",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    code: varchar("code", { length: 50 }).notNull().unique(),

    name: varchar("name", { length: 150 }).notNull(),

    description: text("description"),

    priceCents: integer("price_cents").notNull(),

    totalStock: integer("total_stock").notNull(),

    remainingStock: integer("remaining_stock").notNull(),

    // True when the extra can only be purchased for specific festival dates.
    dateRestricted: boolean("date_restricted").notNull().default(false),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "extras_price_nonnegative",
      sql`${table.priceCents} >= 0`,
    ),
    check(
      "extras_stock_valid",
      sql`${table.totalStock} >= 0 AND ${table.remainingStock} >= 0 AND ${table.remainingStock} <= ${table.totalStock}`,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/* Promo codes                                                                */
/* -------------------------------------------------------------------------- */

export const promoCodes = pgTable(
  "promo_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    code: varchar("code", { length: 50 }).notNull().unique(),

    description: text("description"),

    discountType: discountTypeEnum("discount_type").notNull(),

    // Percentage discounts use basis points: 1000 = 10%.
    discountValue: integer("discount_value").notNull(),

    startsAt: timestamp("starts_at", {
      withTimezone: true,
    }),

    expiresAt: timestamp("expires_at", {
      withTimezone: true,
    }),

    usageLimit: integer("usage_limit"),

    usageCount: integer("usage_count").notNull().default(0),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "promo_codes_discount_nonnegative",
      sql`${table.discountValue} >= 0`,
    ),
    check(
      "promo_codes_usage_valid",
      sql`${table.usageCount} >= 0
        AND (${table.usageLimit} IS NULL OR ${table.usageLimit} >= 0)
        AND (${table.usageLimit} IS NULL OR ${table.usageCount} <= ${table.usageLimit})`,
    ),
    check(
      "promo_codes_date_range_valid",
      sql`${table.startsAt} IS NULL
        OR ${table.expiresAt} IS NULL
        OR ${table.startsAt} < ${table.expiresAt}`,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/* Bookings                                                                   */
/* -------------------------------------------------------------------------- */

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    bookingNumber: varchar("booking_number", {
      length: 30,
    })
      .notNull()
      .unique(),

    bookerName: varchar("booker_name", {
      length: 150,
    }).notNull(),

    bookerEmail: varchar("booker_email", {
      length: 254,
    }).notNull(),

    bookerPhone: varchar("booker_phone", {
      length: 30,
    }).notNull(),

    status: bookingStatusEnum("status")
      .notNull()
      .default("pending_payment"),

    currency: varchar("currency", { length: 3 })
      .notNull()
      .default("USD"),

    subtotalCents: integer("subtotal_cents").notNull(),

    discountCents: integer("discount_cents").notNull().default(0),

    totalCents: integer("total_cents").notNull(),

    promoCodeId: uuid("promo_code_id").references(
      () => promoCodes.id,
      { onDelete: "set null" },
    ),

    // Prevents duplicate processing of a booking creation request.
    idempotencyKey: varchar("idempotency_key", {
      length: 100,
    }).notNull().unique(),

    requestHash: varchar("request_hash", {
    length: 64,
    }).notNull(),

    expiresAt: timestamp("expires_at", {
      withTimezone: true,
    }),

    confirmedAt: timestamp("confirmed_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "bookings_amounts_valid",
      sql`${table.subtotalCents} >= 0
        AND ${table.discountCents} >= 0
        AND ${table.totalCents} >= 0
        AND ${table.discountCents} <= ${table.subtotalCents}
        AND ${table.totalCents} = ${table.subtotalCents} - ${table.discountCents}`,
    ),
    index("bookings_status_idx").on(table.status),
    index("bookings_created_at_idx").on(table.createdAt),
  ],
);

/* -------------------------------------------------------------------------- */
/* Booking items                                                              */
/* -------------------------------------------------------------------------- */

export const bookingItems = pgTable(
  "booking_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),

    itemType: bookingItemTypeEnum("item_type").notNull(),

    ticketTypeId: uuid("ticket_type_id").references(
      () => ticketTypes.id,
      { onDelete: "restrict" },
    ),

    extraId: uuid("extra_id").references(
      () => extras.id,
      { onDelete: "restrict" },
    ),

    quantity: integer("quantity").notNull(),

    unitPriceCents: integer("unit_price_cents").notNull(),

    lineTotalCents: integer("line_total_cents").notNull(),

    // Snapshot of the item's display name at purchase time.
    itemName: varchar("item_name", { length: 150 }).notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "booking_items_reference_valid",
      sql`(
        ${table.itemType} = 'ticket'
        AND ${table.ticketTypeId} IS NOT NULL
        AND ${table.extraId} IS NULL
      ) OR (
        ${table.itemType} = 'extra'
        AND ${table.extraId} IS NOT NULL
        AND ${table.ticketTypeId} IS NULL
      )`,
    ),
    check(
      "booking_items_amounts_valid",
      sql`${table.quantity} > 0
        AND ${table.unitPriceCents} >= 0
        AND ${table.lineTotalCents} >= 0
        AND ${table.lineTotalCents} = ${table.quantity} * ${table.unitPriceCents}`,
    ),
    index("booking_items_booking_id_idx").on(table.bookingId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Booking item dates                                                         */
/* -------------------------------------------------------------------------- */

export const bookingItemDates = pgTable(
  "booking_item_dates",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    bookingItemId: uuid("booking_item_id")
      .notNull()
      .references(() => bookingItems.id, { onDelete: "cascade" }),

    festivalDateId: uuid("festival_date_id")
      .notNull()
      .references(() => festivalDates.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("booking_item_dates_unique").on(
      table.bookingItemId,
      table.festivalDateId,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/* Attendees                                                                  */
/* -------------------------------------------------------------------------- */

export const attendees = pgTable(
  "attendees",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),

    bookingItemId: uuid("booking_item_id")
      .notNull()
      .references(() => bookingItems.id, { onDelete: "cascade" }),

    firstName: varchar("first_name", { length: 100 }).notNull(),

    lastName: varchar("last_name", { length: 100 }).notNull(),

    dateOfBirth: date("date_of_birth").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("attendees_booking_id_idx").on(table.bookingId),
    index("attendees_booking_item_id_idx").on(table.bookingItemId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Promo redemptions                                                          */
/* -------------------------------------------------------------------------- */

export const promoRedemptions = pgTable(
  "promo_redemptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    promoCodeId: uuid("promo_code_id")
      .notNull()
      .references(() => promoCodes.id, { onDelete: "restrict" }),

    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),

    discountCents: integer("discount_cents").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("promo_redemptions_booking_unique").on(
      table.bookingId,
    ),
    check(
      "promo_redemptions_discount_nonnegative",
      sql`${table.discountCents} >= 0`,
    ),
    index("promo_redemptions_promo_code_idx").on(table.promoCodeId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Payments                                                                   */
/* -------------------------------------------------------------------------- */

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "restrict" }),

    status: paymentStatusEnum("status").notNull().default("pending"),

    amountCents: integer("amount_cents").notNull(),

    currency: varchar("currency", { length: 3 })
      .notNull()
      .default("USD"),

    provider: varchar("provider", { length: 30 })
      .notNull()
      .default("simulated"),

    providerReference: varchar("provider_reference", {
      length: 150,
    }),

    idempotencyKey: varchar("idempotency_key", {
      length: 100,
    }).notNull().unique(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "payments_amount_nonnegative",
      sql`${table.amountCents} >= 0`,
    ),
    index("payments_booking_id_idx").on(table.bookingId),
  ],
);