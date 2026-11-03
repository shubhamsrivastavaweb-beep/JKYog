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