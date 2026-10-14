// Date handling for Weatherlend.
//
// Rules (agreed with the client team):
// - All dates are calendar days, no times. "2026-11-14" means the whole day.
// - A loan for [from, to] covers `to - from` nights: end-exclusive, hotel
//   style. Borrowing "18 to 19 November" is 1 night.
// - Everything is clamped to the 2026/27 school year.
// Time zones are the classic bug source here, so parsing and formatting
// always go through UTC midnight and comparisons use YYYY-MM-DD keys.

/** First and last bookable day of the 2026/27 school year (inclusive). */
export const SCHOOL_YEAR_START_KEY = "2026-09-01";
export const SCHOOL_YEAR_END_KEY = "2027-08-31";

/** Strictly parses "YYYY-MM-DD" (as produced by <input type="date">). */
export function parseDateKey(key: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    throw new DateError(`"${key}" is not a YYYY-MM-DD date.`);
  }
  const date = new Date(`${key}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || toDateKey(date) !== key) {
    throw new DateError(`"${key}" is not a real calendar day.`);
  }
  return date;
}

/** "2026-11-14" for a Date. Always UTC — never local time. */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Nights in [from, to]: end-exclusive. Negative if `to` is before `from`. */
export function nightsBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

/** Today as a YYYY-MM-DD key (UTC). */
export function todayKey(): string {
  return toDateKey(new Date());
}

/**
 * Validates a [from, to] range against the house rules.
 * Returns null when valid, otherwise a human-readable reason.
 */
export function validateRange(fromKey: string, toKey: string): string | null {
  let from: Date;
  let to: Date;
  try {
    from = parseDateKey(fromKey);
    to = parseDateKey(toKey);
  } catch (error) {
    return error instanceof DateError ? error.message : "Invalid dates.";
  }
  if (nightsBetween(from, to) < 1) {
    return "The end day must be after the start day (at least one night).";
  }
  if (fromKey < SCHOOL_YEAR_START_KEY || toKey > SCHOOL_YEAR_END_KEY) {
    return "Dates must fall inside the 2026/27 school year (Sep 2026 – Aug 2027).";
  }
  return null;
}

/** "November" for a Date (UTC). */
export function formatMonth(date: Date): string {
  return date.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
}

/** "14 November" — day and month, no year (mockup style). */
export function formatDay(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/** "14 to 21 November" for a booking range (mockup style). */
export function formatRange(from: Date, to: Date): string {
  const sameMonth =
    from.getUTCFullYear() === to.getUTCFullYear() &&
    from.getUTCMonth() === to.getUTCMonth();
  if (sameMonth) return `${from.getUTCDate()} to ${formatDay(to)}`;
  return `${formatDay(from)} to ${formatDay(to)}`;
}

/**
 * "June to August" for an offer window, or "all year" when the window
 * covers the whole school year (mockup style).
 */
export function availabilityLabel(from: Date, to: Date): string {
  const fromKey = toDateKey(from);
  const toKey = toDateKey(to);
  if (fromKey <= SCHOOL_YEAR_START_KEY && toKey >= SCHOOL_YEAR_END_KEY) {
    return "all year";
  }
  return `${formatMonth(from)} to ${formatMonth(to)}`;
}

export class DateError extends Error {}
