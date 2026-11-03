# Sharad Utsav 2026 — Ticket Booking Application

A full-stack ticket booking application for Sharad Utsav 2026, built with Next.js, TypeScript, PostgreSQL, Drizzle ORM, and Supabase.

The application supports festival ticket selection, attendee details, optional extras, promo codes, booking summaries, inventory management, and simulated payment confirmation.

## Features

- Festival ticket booking for November 10–14, 2026.
- Day Pass, All-Day Pass, and Family Pass options.
- Adult and child eligibility validation based on age on the admission date.
- Optional extras: Dandiya Sticks, Dinner Plate, and Garba Workshop.
- Promo code validation and discount calculation.
- Live booking quote with subtotal, discount, and total.
- Server-side price and inventory validation.
- Atomic inventory reservation and promo redemption.
- Idempotent booking creation to prevent duplicate bookings.
- Simulated payment processing and booking confirmation.
- PostgreSQL persistence through Supabase.

## Technology Stack

| Area | Technology |
|---|---|
| Frontend | Next.js App Router, React, TypeScript |
| Styling | CSS |
| Backend | Next.js Route Handlers |
| Database | Supabase PostgreSQL |
| ORM | Drizzle ORM |
| Validation | Zod |
| Testing | Vitest |
| Deployment | Vercel |

## Requirements

- Node.js (LTS recommended)
- npm
- A Supabase PostgreSQL project
- Git

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/shubhamsrivastavaweb-beep/JKYog.git
cd jkyog
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root.

Add the following variables:

```env
DATABASE_URL=your_supabase_pooled_connection_string
DIRECT_URL=your_supabase_direct_connection_string

TEST_DATABASE_URL=your_test_supabase_pooled_connection_string
TEST_DIRECT_URL=your_test_supabase_direct_connection_string
```

Use separate Supabase projects for the application database and integration-test database.

Never commit `.env.local` or expose database credentials in source code.

### 4. Run database migrations

Generate migrations when the database schema changes:

```bash
npm run db:generate
```

Apply migrations:

```bash
npm run db:migrate
```

The Drizzle configuration uses `DIRECT_URL` for migrations.

### 5. Seed the database

The project includes a database seeder:

```bash
npm run db:seed
```

For the isolated integration-test database:

```bash
npm run db:seed:test
```

**Important:** Run the test seeder only against the dedicated test database. Do not use test database credentials for production.

### 6. Start the development server

```bash
npm run dev
```

Open:

http://localhost:3000

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run the automated test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed` | Seed the application database |
| `npm run db:seed:test` | Seed the integration-test database |

## API Overview

### GET `/api/catalog`

Returns the festival catalog, including:

- Festival dates.
- Ticket types, prices, and available stock.
- Optional extras, prices, and available stock.

### POST `/api/bookings/quote`

Calculates a booking quote without reserving inventory.

Returns pricing information, including:

- Subtotal.
- Applied discount.
- Total.
- Pricing validation errors, where applicable.

### POST `/api/bookings`

Creates a booking after validating the request.

The booking flow includes:

1. Request and attendee validation.
2. Server-side catalog and pricing validation.
3. Promo code validation.
4. Inventory reservation.
5. Booking and attendee persistence.
6. Promo redemption recording.
7. Simulated payment recording.
8. Booking confirmation.

Booking creation is performed transactionally to prevent partial bookings and overselling.

## Testing

Run the complete automated test suite:

```bash
npm run test
```

Run TypeScript validation:

```bash
npx tsc --noEmit
```

Create a production build:

```bash
npm run build
```

The automated test suite currently contains **33 passing tests**:

| Test suite | Tests |
|---|---:|
| Booking integration tests | 4 |
| Pricing calculation | 16 |
| Attendee age validation | 8 |
| Booking request schema | 5 |
| **Total** | **33** |

Integration tests use a separate Supabase test database to avoid modifying application data.

See [TEST-CASES.md](./TEST-CASES.md) for detailed automated and manual test coverage.

## Deployment

The application is intended to be deployed on Vercel.

General deployment steps:

1. Push the project to a Git repository.
2. Import the repository into Vercel.
3. Configure the required production environment variables:
   - `DATABASE_URL`
   - `DIRECT_URL`
4. Ensure the production Supabase database has all migrations applied and the required catalog data seeded.
5. Deploy the application.
6. Verify the booking page and API routes on the deployed URL.

Do not configure test database credentials as production environment variables.

## Project Structure

```text
jkyog/
├── app/
│   ├── api/
│   │   ├── bookings/
│   │   │   ├── quote/
│   │   │   └── route.ts
│   │   └── catalog/
│   ├── booking/
│   │   ├── components/
│   │   ├── booking-reducer.ts
│   │   ├── booking-types.ts
│   │   └── use-booking.ts
│   ├── globals.css
│   └── page.tsx
├── drizzle/
├── src/
│   ├── db/
│   └── lib/
│       ├── booking/
│       └── pricing/
├── TEST-CASES.md
├── drizzle.config.ts
├── drizzle.test.config.ts
├── vitest.config.mts
└── package.json
```

## Documentation

- [DESIGN.md](../DESIGN.md) — Architecture and design decisions.
- [TEST-CASES.md](./TEST-CASES.md) — Automated and manual test coverage.
- [README.md](./README.md) — Setup, usage, testing, and deployment instructions.

## Decisions I made

### Garba Workshop inventory

The assignment specifies two workshop registrations but does not
clarify whether the stock is shared between November 11 and 13.
I treat the stock of two as a combined limit across both dates.
This is consistent with the single inventory balance stored for
the workshop in the database and prevents overselling.

### Family Pass eligibility

Each Family Pass covers two adults aged 12 or older and two
children aged 5–11. A Family Pass is valid for one festival day.
I require attendee details for all four people so eligibility
can be checked.

### Attendee age calculation

I calculate attendee age on the selected festival admission date,
rather than the booking date. This ensures the age category
reflects the attendee's age when attending.

### Under-five attendees

Children younger than five do not require paid tickets and cannot
be assigned to a paid ticket selection.


### Inventory reservation timing

Inventory is reserved when a booking is successfully created. A quote does not reserve inventory. This avoids holding stock for customers who have not submitted a booking.

### Simulated payment

The application uses simulated payment processing. A booking is confirmed immediately after the simulated payment succeeds. This keeps the implementation focused on booking and inventory correctness without requiring an external payment provider.

### Transaction atomicity

Booking creation, inventory reservation, promo redemption, attendee creation, and simulated payment recording are performed in a single database transaction. If any operation fails, all changes are rolled back. This prevents partially created bookings and inconsistent inventory.

### Idempotent booking requests

Each booking request requires an idempotency key. Repeating the same request with the same key returns the existing booking. Reusing the key with different booking details is rejected to prevent accidental duplicate or conflicting bookings.