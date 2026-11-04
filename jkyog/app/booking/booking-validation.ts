import type {
  BookingState,
  Attendee,
  Ticket,
  TicketSelection,
} from "./booking-types";

const FIRST_FESTIVAL_DATE = "2026-11-10";
const LATEST_BOOKER_DOB = "2008-11-10";

const WORKSHOP_DATES = [
  "2026-11-11",
  "2026-11-13",
];

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  // Parse as UTC to avoid timezone-related date shifts.
  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function calculateAge(
  dateOfBirth: string,
  admissionDate: string
): number {
  const [birthYear, birthMonth, birthDay] = dateOfBirth
    .split("-")
    .map(Number);

  const [admissionYear, admissionMonth, admissionDay] = admissionDate
    .split("-")
    .map(Number);

  let age = admissionYear - birthYear;

  if (
    admissionMonth < birthMonth ||
    (admissionMonth === birthMonth && admissionDay < birthDay)
  ) {
    age--;
  }

  return age;
}

function validateAttendee(
  attendee: Attendee,
  ticket: Ticket,
  index: number,
  selection: TicketSelection
): string[] {
  const errors: string[] = [];
  const label =
    ticket.code === "FAMILY_PASS"
      ? `Family Pass attendee ${index + 1}`
      : `${ticket.name} attendee ${index + 1}`;

  if (!attendee.firstName.trim()) {
    errors.push(`${label}: first name is required.`);
  }

  if (!attendee.lastName.trim()) {
    errors.push(`${label}: last name is required.`);
  }

  if (!attendee.dateOfBirth) {
    errors.push(`${label}: date of birth is required.`);
    return errors;
  }

  if (!isValidDate(attendee.dateOfBirth)) {
    errors.push(`${label}: enter a valid date of birth.`);
    return errors;
  }

  for (const date of selection.dates) {
    const age = calculateAge(attendee.dateOfBirth, date);

    if (age < 0) {
      errors.push(
        `${label}: date of birth cannot be after the admission date.`
      );
      break;
    }

    if (age < 5) {
      errors.push(
        `${label}: attendees under 5 do not require a paid ticket.`
      );
      break;
    }

    if (ticket.code === "FAMILY_PASS") {
      const position = index % 4;
      const isAdultPosition = position < 2;

      if (isAdultPosition && age < 12) {
        errors.push(
          `${label}: Family Pass adult attendees must be at least 12.`
        );
        break;
      }

      if (!isAdultPosition && age > 11) {
        errors.push(
          `${label}: Family Pass child attendees must be between 5 and 11.`
        );
        break;
      }

      continue;
    }

    if (ticket.minAge !== null && age < ticket.minAge) {
      errors.push(
        `${label}: minimum age for this ticket is ${ticket.minAge}.`
      );
      break;
    }

    if (ticket.maxAge !== null && age > ticket.maxAge) {
      errors.push(
        `${label}: maximum age for this ticket is ${ticket.maxAge}.`
      );
      break;
    }
  }

  return errors;
}

export function validateBookingForm(
  state: BookingState
): string[] {
  const errors: string[] = [];
  const catalog = state.catalog;

  if (!catalog) {
    return ["Festival catalog is not available."];
  }

  const selectedTickets = Object.values(state.tickets).filter(
    (selection) => selection.quantity > 0
  );

  const selectedExtras = Object.values(state.extras).filter(
    (selection) => selection.quantity > 0
  );

  // At least one ticket is required.
  if (selectedTickets.length === 0) {
    errors.push("Select at least one ticket.");
  }

  // Validate tickets and attendees.
  for (const selection of selectedTickets) {
    const ticket = catalog.tickets.find(
      (item) => item.code === selection.code
    );

    if (!ticket) {
      errors.push(`Invalid ticket selection: ${selection.code}.`);
      continue;
    }

    if (!ticket.isActive) {
      errors.push(`${ticket.name} is currently unavailable.`);
    }

    if (selection.quantity > ticket.remainingStock) {
      errors.push(
        `${ticket.name}: only ${ticket.remainingStock} tickets remain.`
      );
    }

    if (
      !Number.isInteger(selection.quantity) ||
      selection.quantity < 1 ||
      selection.quantity > 20
    ) {
      errors.push(`${ticket.name}: invalid quantity.`);
    }

    if (selection.dates.length === 0) {
      errors.push(`${ticket.name}: select at least one festival date.`);
    }

    const uniqueDates = new Set(selection.dates);

    if (uniqueDates.size !== selection.dates.length) {
      errors.push(`${ticket.name}: duplicate festival dates selected.`);
    }

    for (const date of selection.dates) {
      const isAvailableDate = catalog.festivalDates.some(
        (festivalDate) =>
          festivalDate.date === date
      );

      if (!isAvailableDate) {
        errors.push(`${ticket.name}: invalid festival date selected.`);
      }
    }

    if (
      ticket.pricingModel === "flat" &&
      selection.dates.length !== ticket.admissionDays
    ) {
      errors.push(
        `${ticket.name}: this pass includes all festival dates.`
      );
    }

    if (
      ticket.code === "FAMILY_PASS" &&
      selection.dates.length !== 1
    ) {
      errors.push("Family Pass is valid for one festival day only.");
    }

    const expectedAttendeeCount =
      ticket.code === "FAMILY_PASS"
        ? selection.quantity * 4
        : selection.quantity;

    if (selection.attendees.length !== expectedAttendeeCount) {
      errors.push(
        `${ticket.name}: provide details for ${expectedAttendeeCount} attendees.`
      );
      continue;
    }

    selection.attendees.forEach((attendee, index) => {
      errors.push(
        ...validateAttendee(
          attendee,
          ticket,
          index,
          selection
        )
      );
    });
  }

  // Validate extras.
  for (const selection of selectedExtras) {
    const extra = catalog.extras.find(
      (item) => item.code === selection.code
    );

    if (!extra) {
      errors.push(`Invalid extra selection: ${selection.code}.`);
      continue;
    }

    if (!extra.isActive) {
      errors.push(`${extra.name} is currently unavailable.`);
    }

    if (
      !Number.isInteger(selection.quantity) ||
      selection.quantity < 1 ||
      selection.quantity > 100
    ) {
      errors.push(`${extra.name}: invalid quantity.`);
    }

    const requiredStock =
      selection.code === "DINNER_PLATE"
        ? selection.quantity * selection.dates.length
        : selection.quantity;

    if (requiredStock > extra.remainingStock) {
      errors.push(
        `${extra.name}: not enough stock remains.`
      );
    }

    if (
      selection.code === "DINNER_PLATE" &&
      selection.dates.length === 0
    ) {
      errors.push("Select festival dates for Dinner Plates.");
    }

    if (
      selection.code === "GARBA_WORKSHOP" &&
      selection.dates.length === 0
    ) {
      errors.push("Select a date for the Garba Workshop.");
    }

    if (
      selection.code === "GARBA_WORKSHOP" &&
      selection.dates.some(
        (date) => !WORKSHOP_DATES.includes(date)
      )
    ) {
      errors.push(
        "Garba Workshop is available only on November 11 and November 13."
      );
    }

    if (
      new Set(selection.dates).size !== selection.dates.length
    ) {
      errors.push(`${extra.name}: duplicate dates selected.`);
    }

    for (const date of selection.dates) {
      const isAvailableDate = catalog.festivalDates.some(
        (festivalDate) => festivalDate.date === date
      );

      if (!isAvailableDate) {
        errors.push(`${extra.name}: invalid festival date selected.`);
      }
    }
  }

  // Validate booker details.
  const booker = state.booker;

  if (!booker.firstName.trim()) {
    errors.push("Booker first name is required.");
  }

  if (!booker.lastName.trim()) {
    errors.push("Booker last name is required.");
  }

  if (!booker.email.trim()) {
    errors.push("Booker email address is required.");
  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booker.email.trim())
  ) {
    errors.push("Enter a valid booker email address.");
  }

  if (!booker.phone.trim()) {
    errors.push("Booker phone number is required.");
  }

  if (!booker.dateOfBirth) {
    errors.push("Booker date of birth is required.");
  } else if (!isValidDate(booker.dateOfBirth)) {
    errors.push("Enter a valid booker date of birth.");
  } else if (booker.dateOfBirth > LATEST_BOOKER_DOB) {
    errors.push(
      "The person booking must be at least 18 years old on November 10, 2026."
    );
  }

  // A valid, current quote is required before submission.
  if (state.quoteLoading) {
    errors.push("Please wait while your booking total is calculated.");
  } else if (state.quoteError) {
    errors.push("Invalid promo code.");
  } else if (!state.quote) {
    errors.push("Your booking total has not been calculated yet.");
  }

  return [...new Set(errors)];
}