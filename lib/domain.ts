// Shared vocabulary for booking/request/ledger statuses.
// Stored as plain text (not DB enums) so new states never need a migration.

export const BOOKING_STATUS = {
  UPCOMING: "upcoming",
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;
export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

/** A booking blocks its offer's dates unless it was cancelled. */
export function bookingBlocksDates(status: string): boolean {
  return status !== BOOKING_STATUS.CANCELLED;
}

export const REQUEST_STATUS = {
  OPEN: "open",
  FULFILLED: "fulfilled",
  CANCELLED: "cancelled",
} as const;
export type RequestStatus = (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS];

export const LEDGER_REASON = {
  WELCOME: "welcome",
  LEND: "lend",
  BORROW: "borrow",
  REFUND_LEND: "refund_lend",
  REFUND_BORROW: "refund_borrow",
} as const;
export type LedgerReason = (typeof LEDGER_REASON)[keyof typeof LEDGER_REASON];

/** Points every new user starts with (tender §4). */
export const WELCOME_POINTS = 10;

/** Human-readable ledger lines for the points history (mockup screen 4). */
export function describeLedgerEntry(reason: string): { verb: string; earned: boolean } {
  switch (reason) {
    case LEDGER_REASON.LEND:
      return { verb: "Lent", earned: true };
    case LEDGER_REASON.BORROW:
      return { verb: "Borrowed", earned: false };
    case LEDGER_REASON.REFUND_LEND:
      return { verb: "Cancelled loan (was lending)", earned: false };
    case LEDGER_REASON.REFUND_BORROW:
      return { verb: "Cancelled loan (was borrowing)", earned: true };
    case LEDGER_REASON.WELCOME:
      return { verb: "Welcome points", earned: true };
    default:
      return { verb: reason, earned: false };
  }
}
