import type {
  AttendeeInput,
  CatalogTicket,
  TicketSelection,
} from "./types";

const FESTIVAL_DATES = [
  "2026-11-10",
  "2026-11-11",
  "2026-11-12",
  "2026-11-13",
  "2026-11-14",
];

function calculateAgeOnDate(
  dateOfBirth: string,
  festivalDate: string,
): number | null {
  const dob = new Date(`${dateOfBirth}T00:00:00.000Z`);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ||
    Number.isNaN(dob.getTime()) ||
    dob.toISOString().slice(0, 10) !== dateOfBirth
  ) {
    return null;
  }

  const eventDate = new Date(`${festivalDate}T00:00:00.000Z`);

  let age = eventDate.getUTCFullYear() - dob.getUTCFullYear();

  const beforeBirthday =
    eventDate.getUTCMonth() < dob.getUTCMonth() ||
    (eventDate.getUTCMonth() === dob.getUTCMonth() &&
      eventDate.getUTCDate() < dob.getUTCDate());

  if (beforeBirthday) age--;

  return age;
}

export function validateAttendees(
  selection: TicketSelection,
  ticket: CatalogTicket,
): string[] {
  const errors: string[] = [];
  const attendees: AttendeeInput[] = selection.attendees ?? [];

  if (ticket.code === "FAMILY_PASS") {
    if (attendees.length !== selection.quantity * 4) {
      errors.push(
        "Each Family Pass requires exactly two adults and two children.",
      );
      return errors;
    }

    for (const date of selection.dates) {
      if (!FESTIVAL_DATES.includes(date)) {
        errors.push("Family Pass contains an invalid festival date.");
        continue;
      }

      const ages = attendees.map((attendee) =>
        calculateAgeOnDate(attendee.dateOfBirth, date),
      );

      if (ages.some((age) => age === null)) {
        errors.push("Every attendee must have a valid date of birth.");
        continue;
      }

      const adultCount = ages.filter((age) => age !== null && age >= 12).length;
      const childCount = ages.filter(
        (age) => age !== null && age >= 5 && age <= 11,
      ).length;

      if (adultCount !== 2 * selection.quantity ||
          childCount !== 2 * selection.quantity) {
        errors.push(
          "Each Family Pass must cover two adults aged 12+ and two children aged 5–11.",
        );
      }
    }

    return [...new Set(errors)];
  }

  if (attendees.length !== selection.quantity) {
    errors.push(
      `${ticket.name}: provide attendee details for each ticket.`,
    );
    return errors;
  }

  for (const attendee of attendees) {
    for (const date of selection.dates) {
      if (!FESTIVAL_DATES.includes(date)) continue;

      const age = calculateAgeOnDate(attendee.dateOfBirth, date);

      if (age === null) {
        errors.push(`${ticket.name}: attendee date of birth is invalid.`);
        break;
      }

      if (age < 5) {
        errors.push(
          "Children under 5 do not require a ticket and must not be assigned a paid ticket.",
        );
        break;
      }

      if (ticket.minAge !== null && age < ticket.minAge) {
        errors.push(`${ticket.name}: attendee does not meet the minimum age.`);
        break;
      }

      if (ticket.maxAge !== null && age > ticket.maxAge) {
        errors.push(`${ticket.name}: attendee exceeds the maximum age.`);
        break;
      }
    }
  }

  return [...new Set(errors)];
}