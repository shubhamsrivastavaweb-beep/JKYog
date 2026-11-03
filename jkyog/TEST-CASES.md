# Test Cases — Sharad Utsav 2026 Ticket Booking

## 1. Automated Tests

**Command:** `npm run test`

| Test suite | Tests | Result |
|---|---:|---|
| Booking integration tests | 4 | Passed |
| Pricing calculation | 16 | Passed |
| Attendee age validation | 8 | Passed |
| Booking request schema | 5 | Passed |
| **Total** | **33** | **All passed** |

### Booking integration tests

| Scenario | Expected result | Observed result | Status |
|---|---|---|---|
| Two customers compete for the last ticket | Only one booking succeeds | One succeeds; one receives HTTP 409; stock remains correct | Passed |
| Two identical concurrent requests use the same idempotency key | Only one booking is created | Both receive the same booking; no duplicate | Passed |
| Two bookings compete for the final promo redemption | Only one redemption succeeds | One succeeds; one is rejected; usage limit is respected | Passed |
| Two customers compete for the last extra | Only one booking succeeds | One succeeds; losing transaction rolls back ticket reservation | Passed |

Integration tests use a separate Supabase test database.

## 2. Static Checks and Production Build

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | Passed |
| Automated tests | `npm run test` | Passed |
| Production build | `npm run build` | Passed |

## 3. Booking API — Manual Tests

| Scenario | Expected result | Observed result | Status |
|---|---|---|---|
| Valid adult day pass | Booking created | HTTP 201; $15.00 | Passed |
| Same idempotency key and same request | Existing booking returned | Same booking ID; no duplicate | Passed |
| Same idempotency key with changed request | Conflict | HTTP 409 | Passed |
| Invalid JSON | Bad request | HTTP 400 | Passed |
| Missing attendee details | Bad request | HTTP 400 | Passed |
| Valid child day pass | Booking created | HTTP 201; $16.00 for two children | Passed |
| Sold-out All-Day Adult Pass | Insufficient stock | HTTP 422 | Passed |

## 4. Promo Code Tests

| Promo | Scenario | Observed result | Status |
|---|---|---|---|
| SEVA10 | 10% discount on $15 | $1.50 discount; total $13.50 | Passed |
| FLAT20 | $20 discount on $30 | $20.00 discount; total $10.00 | Passed |
| KIDSFREE | Child ticket free | $8.00 discount; total $15.00 | Passed |
| EXPIRED5 | Expired promo | HTTP 422 | Passed |
| MAXEDOUT | Usage limit reached | HTTP 422 | Passed |
| Invalid code | Unknown promo | HTTP 422 | Passed |

Promo redemption records and usage counts were checked in PostgreSQL. Successful promo redemptions were recorded; invalid, expired, and exhausted codes did not create redemption records.

Concurrent redemption testing also verified that the usage limit cannot be exceeded.

## 5. Extras and Inventory Tests

| Scenario | Observed result | Status |
|---|---|---|
| Two Dandiya Stick pairs | HTTP 201; stock reduced from 900 to 898 | Passed |
| Dinner Plates for two dates | HTTP 201; stock reduced by two | Passed |
| Garba Workshop on Nov 11 | HTTP 201; stock reduced from 2 to 1 | Passed |
| Garba Workshop on Nov 12 | HTTP 400; date rejected | Passed |
| Garba Workshop on Nov 13 | HTTP 201; stock reduced from 1 to 0 | Passed |
| Third workshop registration | HTTP 422; insufficient stock | Passed |
| Dinner Plate quantity across multiple dates exceeds stock | Pricing rejected | Passed |

The workshop's stock is shared across its two eligible dates.

Dinner Plate inventory is calculated as quantity multiplied by the number of selected dates.

## 6. Family Pass Tests

| Scenario | Observed result | Status |
|---|---|---|
| Two adults and two children for one date | HTTP 201; $40.00 | Passed |
| Three adults and one child | HTTP 422 | Passed |
| Family Pass selected for two dates | HTTP 400 | Passed |

## 7. Attendee and Booker Age Tests

| Scenario | Observed result | Status |
|---|---|---|
| Under-5 attendee assigned a paid child ticket | HTTP 422 | Passed |
| Child exactly age 5 on admission date | HTTP 201 | Passed |
| Child exactly age 12 assigned a child ticket | HTTP 422 | Passed |
| Attendee exactly age 12 assigned an adult ticket | HTTP 201 | Passed |
| Valid All-Day Child Pass covering all five dates | HTTP 201 | Passed |
| All-Day Child Pass missing one date | HTTP 400 | Passed |
| Booker under age 18 | HTTP 400 | Passed |
| Booker exactly age 18 on first festival date | HTTP 201 | Passed |

## 8. Catalog and Quote API Tests

### GET /api/catalog

- HTTP 200.
- Returned all five festival dates.
- Returned five active ticket types.
- Returned three active extras.
- Prices and remaining stock matched database records.

### POST /api/bookings/quote

| Scenario | Observed result | Status |
|---|---|---|
| DAY_ADULT with SEVA10 | HTTP 200; subtotal $15.00, discount $1.50, total $13.50 | Passed |
| Invalid promo code | HTTP 422 | Passed |
| Sold-out All-Day Adult Pass | HTTP 422 | Passed |
| Quote does not reserve inventory | DAY_ADULT stock remained unchanged during quote | Passed |

## 9. Database and Transaction Verification

- Booking creation was verified in PostgreSQL.
- Simulated successful payments were verified.
- Ticket and extra stock reductions were verified.
- Promo usage counts and redemption records were verified.
- Idempotent retries did not create duplicate bookings.
- Failed validation and insufficient-stock requests did not consume inventory.
- Concurrent ticket reservations did not oversell inventory.
- Concurrent extra reservations did not oversell inventory.
- Failed concurrent extra reservation rolled back the associated ticket reservation.
- Concurrent promo redemption attempts respected the usage limit.

## 10. Final Verification Before Submission

- [x] Automated tests — 33 passed.
- [x] TypeScript validation.
- [x] Production build.
- [x] Booking concurrency tests.
- [x] Promo concurrency test.
- [x] Extras inventory concurrency test.
- [ ] Final browser walkthrough.
- [ ] Final README review.
- [ ] Vercel deployment.
- [ ] Production smoke tests.
- [ ] Final submission and demo recording.
