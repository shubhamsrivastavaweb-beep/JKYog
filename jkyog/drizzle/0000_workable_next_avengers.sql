CREATE TYPE "public"."booking_item_type" AS ENUM('ticket', 'extra');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending_payment', 'confirmed', 'failed', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('percentage', 'fixed_amount', 'free_children');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'succeeded', 'failed', 'refunded');--> statement-breakpoint
CREATE TABLE "attendees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"booking_item_id" uuid NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"date_of_birth" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_item_dates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_item_id" uuid NOT NULL,
	"festival_date_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"item_type" "booking_item_type" NOT NULL,
	"ticket_type_id" uuid,
	"extra_id" uuid,
	"quantity" integer NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"line_total_cents" integer NOT NULL,
	"item_name" varchar(150) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_items_reference_valid" CHECK ((
        "booking_items"."item_type" = 'ticket'
        AND "booking_items"."ticket_type_id" IS NOT NULL
        AND "booking_items"."extra_id" IS NULL
      ) OR (
        "booking_items"."item_type" = 'extra'
        AND "booking_items"."extra_id" IS NOT NULL
        AND "booking_items"."ticket_type_id" IS NULL
      )),
	CONSTRAINT "booking_items_amounts_valid" CHECK ("booking_items"."quantity" > 0
        AND "booking_items"."unit_price_cents" >= 0
        AND "booking_items"."line_total_cents" >= 0
        AND "booking_items"."line_total_cents" = "booking_items"."quantity" * "booking_items"."unit_price_cents")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_number" varchar(30) NOT NULL,
	"booker_name" varchar(150) NOT NULL,
	"booker_email" varchar(254) NOT NULL,
	"booker_phone" varchar(30) NOT NULL,
	"status" "booking_status" DEFAULT 'pending_payment' NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"promo_code_id" uuid,
	"idempotency_key" varchar(100) NOT NULL,
	"expires_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_booking_number_unique" UNIQUE("booking_number"),
	CONSTRAINT "bookings_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "bookings_amounts_valid" CHECK ("bookings"."subtotal_cents" >= 0
        AND "bookings"."discount_cents" >= 0
        AND "bookings"."total_cents" >= 0
        AND "bookings"."discount_cents" <= "bookings"."subtotal_cents"
        AND "bookings"."total_cents" = "bookings"."subtotal_cents" - "bookings"."discount_cents")
);
--> statement-breakpoint
CREATE TABLE "extras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"price_cents" integer NOT NULL,
	"total_stock" integer NOT NULL,
	"remaining_stock" integer NOT NULL,
	"date_restricted" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "extras_code_unique" UNIQUE("code"),
	CONSTRAINT "extras_price_nonnegative" CHECK ("extras"."price_cents" >= 0),
	CONSTRAINT "extras_stock_valid" CHECK ("extras"."total_stock" >= 0 AND "extras"."remaining_stock" >= 0 AND "extras"."remaining_stock" <= "extras"."total_stock")
);
--> statement-breakpoint
CREATE TABLE "festival_dates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"label" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "festival_dates_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"provider" varchar(30) DEFAULT 'simulated' NOT NULL,
	"provider_reference" varchar(150),
	"idempotency_key" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "payments_amount_nonnegative" CHECK ("payments"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"discount_type" "discount_type" NOT NULL,
	"discount_value" integer NOT NULL,
	"starts_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"usage_limit" integer,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code"),
	CONSTRAINT "promo_codes_discount_nonnegative" CHECK ("promo_codes"."discount_value" >= 0),
	CONSTRAINT "promo_codes_usage_valid" CHECK ("promo_codes"."usage_count" >= 0
        AND ("promo_codes"."usage_limit" IS NULL OR "promo_codes"."usage_limit" >= 0)
        AND ("promo_codes"."usage_limit" IS NULL OR "promo_codes"."usage_count" <= "promo_codes"."usage_limit")),
	CONSTRAINT "promo_codes_date_range_valid" CHECK ("promo_codes"."starts_at" IS NULL
        OR "promo_codes"."expires_at" IS NULL
        OR "promo_codes"."starts_at" < "promo_codes"."expires_at")
);
--> statement-breakpoint
CREATE TABLE "promo_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promo_code_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"discount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promo_redemptions_discount_nonnegative" CHECK ("promo_redemptions"."discount_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ticket_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"price_cents" integer NOT NULL,
	"total_stock" integer NOT NULL,
	"remaining_stock" integer NOT NULL,
	"pricing_model" varchar(30) NOT NULL,
	"min_age" integer,
	"max_age" integer,
	"admission_days" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_types_code_unique" UNIQUE("code"),
	CONSTRAINT "ticket_types_price_nonnegative" CHECK ("ticket_types"."price_cents" >= 0),
	CONSTRAINT "ticket_types_stock_valid" CHECK ("ticket_types"."total_stock" >= 0 AND "ticket_types"."remaining_stock" >= 0 AND "ticket_types"."remaining_stock" <= "ticket_types"."total_stock"),
	CONSTRAINT "ticket_types_age_valid" CHECK (("ticket_types"."min_age" IS NULL OR "ticket_types"."min_age" >= 0)
        AND ("ticket_types"."max_age" IS NULL OR "ticket_types"."max_age" >= 0)
        AND ("ticket_types"."min_age" IS NULL OR "ticket_types"."max_age" IS NULL OR "ticket_types"."min_age" <= "ticket_types"."max_age")),
	CONSTRAINT "ticket_types_admission_days_positive" CHECK ("ticket_types"."admission_days" > 0)
);
--> statement-breakpoint
ALTER TABLE "attendees" ADD CONSTRAINT "attendees_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendees" ADD CONSTRAINT "attendees_booking_item_id_booking_items_id_fk" FOREIGN KEY ("booking_item_id") REFERENCES "public"."booking_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_item_dates" ADD CONSTRAINT "booking_item_dates_booking_item_id_booking_items_id_fk" FOREIGN KEY ("booking_item_id") REFERENCES "public"."booking_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_item_dates" ADD CONSTRAINT "booking_item_dates_festival_date_id_festival_dates_id_fk" FOREIGN KEY ("festival_date_id") REFERENCES "public"."festival_dates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_ticket_type_id_ticket_types_id_fk" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."ticket_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_extra_id_extras_id_fk" FOREIGN KEY ("extra_id") REFERENCES "public"."extras"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_promo_code_id_promo_codes_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_promo_code_id_promo_codes_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendees_booking_id_idx" ON "attendees" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "attendees_booking_item_id_idx" ON "attendees" USING btree ("booking_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_item_dates_unique" ON "booking_item_dates" USING btree ("booking_item_id","festival_date_id");--> statement-breakpoint
CREATE INDEX "booking_items_booking_id_idx" ON "booking_items" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bookings_created_at_idx" ON "bookings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payments_booking_id_idx" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "promo_redemptions_booking_unique" ON "promo_redemptions" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "promo_redemptions_promo_code_idx" ON "promo_redemptions" USING btree ("promo_code_id");