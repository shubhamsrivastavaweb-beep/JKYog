# Design Sharad Utsav 2026 Ticketing

## 1. Overview

A responsive ticket-booking application for Sharad Utsav 2026 using Next.js App Router, TypeScript, PostgreSQL, Drizzle ORM, and Zod. Next.js will serve both the user interface and API endpoints, keeping the application simple to deploy on Vercel without maintaining a separate backend service.

The booking flow will cover ticket selection, attendee details, optional extras, promo codes, payment simulation, and booking confirmation.

## 2. Data Model

PostgreSQL stores the following entities across 10 tables:

- **TicketType:** Ticket identifier, name, price in cents, eligibility rules, pricing model, and remaining inventory.
- **Extra:** Extra identifier, name, price in cents, availability rules, and remaining inventory.
- **FestivalDate:** Festival date and associated date information.
- **Booking:** Unique booking ID, booker contact details, status, currency, subtotal, discount, final total, and timestamps.
- **Attendee:** Attendee name, date of birth, and association with a booking item.
- **BookingItem:** Ticket or extra, quantity, unit-price snapshot, and line total.
- **BookingItemDate:** Association between a booking item and its selected festival dates.
- **PromoCode:** Code, discount type, value, validity period, and usage limit, usage count.
- **PromoRedemption:** Booking and promo-code association including the discount applied.
- **Payment:** Booking association, payment status, amount, and simulated transaction reference.

Inventory is maintained through the `remaining_stock` columns in `ticket_types` and `extras`, rather than a separate inventory table. Stock updates and promo-code usage are handled transactionally.

Prices will be stored as integer cents to avoid floating-point rounding errors. Ticket definitions and pricing rules will be represented as structured data rather than inferred from display names.

## 3. Pricing and Booking Rules

The server will be the source of truth for ticket eligibility, pricing, discounts, and totals.

- Day passes cost $15 per adult (age 12+) and $8 per child (ages 5–11), per selected day.
- All-day passes cost $60 per adult and $30 per child and cover all five festival days. Their dates cannot be modified.
- A $40 Family Pass covers two eligible adults and two eligible children for one selected day.
- Children under five do not require tickets. The booker must be at least 18.
- Dandiya Sticks cost $5 per pair, dinner plates cost $12 per person per day, and Garba Workshops cost $20 per attendee on November 11 or November 13 only.
- `SEVA10` applies a 10% booking discount, `FLAT20` deducts $20, and `KIDSFREE` makes eligible child tickets free. Expired, exhausted, and unknown codes will be rejected with clear messages.

I will allow one promo code per booking. Discounts will be calculated server-side, rounded to the nearest cent, and capped so the final total cannot be negative. The exact application of discounts to ticket and extra categories will be consistent and documented.

Each ticket requiring an attendee will have corresponding attendee details. The UI will keep attendee forms synchronized with ticket selections, while the server independently validates attendee counts, ages, and eligibility.

## 4. Inventory and Payment

Inventory must never become negative, including when multiple users attempt to purchase the final available items simultaneously.

Booking creation will use a PostgreSQL transaction to validate availability, reserve all requested inventory, record the booking and its items, and reserve promo-code usage where applicable. Conditional inventory updates will ensure stock is decremented only when sufficient stock remains. If any reservation fails, the transaction will roll back.

For this assignment, payment will be simulated. A booking will move through explicit states such as `pending_payment`, `confirmed`, `failed`, or `cancelled`. Successful payment simulation confirms the booking; failure or cancellation releases its reservations. Duplicate submissions and payment requests will be handled idempotently. Abandoned reservations will have a defined expiry policy.

The supplied stock values will initially be treated as event-wide inventory per ticket or extra type. A day-pass unit represents admission for one person on one selected day; an all-day-pass unit covers one person for all five days. Dinner plates and workshops consume inventory per applicable person and date. This interpretation will be documented because the brief does not fully specify date-specific inventory pools.

## 5. API Contract

All request bodies and parameters will be validated with Zod. API responses will use consistent success and error structures.

- `GET /api/catalog` — Returns ticket types, extras, festival dates, and availability information.
- `POST /api/pricing` — Accepts selected tickets, dates, attendee information, extras, and an optional promo code; returns a server-calculated price breakdown.
- `POST /api/promo-codes/validate` — Validates a promo code and returns its eligibility and discount information.
- `POST /api/bookings` — Validates the complete booking, atomically reserves inventory, and creates a pending booking.
- `GET /api/bookings/:id` — Returns booking details and current status.
- `POST /api/bookings/:id/payment` — Processes the simulated payment and updates booking status.

The client will never be trusted to supply authoritative prices, discounts, inventory counts, or final totals.

## 6. Error Handling and Scope

The application will handle sold-out items, invalid ages, missing attendee details, unsupported dates, invalid or expired promo codes, exhausted promo limits, insufficient stock, payment failures, and duplicate requests. Errors will be actionable and will not expose internal database details.

The initial scope includes the complete booking flow, persistent inventory, simulated payment, responsive design, automated pricing and age-rule tests, and deployment to Vercel. Authentication, real payment processing, and multi-festival administration are outside the initial scope unless time permits. The code will be organized into small domain modules so additional festivals and rule sets can be introduced without coupling business rules to UI components.

## 7. Implementation Notes and Design Updates

The implementation follows the original design principles while making a few adjustments based on the assignment requirements and the final database and API architecture.

### Database implementation

- Ticket and extra inventory is maintained directly through the `remaining_stock` fields in the `ticket_types` and `extras` tables rather than a separate Inventory table.
- Booking items store price snapshots, quantities, and line totals to preserve the pricing applied when a booking is created.
- Festival admission dates are associated with booking items through a separate date-link table.
- Attendee records are associated with their corresponding booking items.
- Promo usage is tracked through promo redemption records and usage counters.

### API implementation

The final API contract is:

- `GET /api/catalog` — Returns festival dates, ticket types, extras, prices, and availability.
- `POST /api/bookings/quote` — Calculates a server-side price breakdown without reserving inventory.
- `POST /api/bookings` — Validates and creates a booking, reserves inventory, records promo redemption where applicable, and records the simulated payment.

The separate pricing and promo-validation endpoints described in the initial design were consolidated into the quote and booking flows.

### Booking and payment lifecycle

The implementation uses simulated payment processing. A successful simulated payment is recorded in the same database transaction as booking creation, and the booking is immediately marked as confirmed.

The database retains explicit booking and payment status fields to support the defined lifecycle and future payment-provider integration.

### Inventory and concurrency protection

Inventory updates use conditional database updates inside the booking transaction. This ensures that concurrent requests cannot reserve more tickets or extras than are available.

Promo-code usage is also updated conditionally within the transaction so concurrent bookings cannot exceed the configured redemption limit.

### Idempotency

Booking requests require an idempotency key and a request-content hash. Repeating an identical request returns the existing booking, while reusing the same key with different request content is rejected.

### Automated verification

The implementation includes unit and integration tests covering pricing, attendee eligibility, request validation, concurrent ticket and extra reservations, idempotent booking creation, and concurrent promo redemption limits.
