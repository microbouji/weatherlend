import { prisma } from "./prisma";
import type { Prisma, Request as LoanRequest } from "@prisma/client";
import {
  BOOKING_STATUS,
  LEDGER_REASON,
  REQUEST_STATUS,
  WELCOME_POINTS,
  bookingBlocksDates,
} from "./domain";
import {
  nightsBetween,
  parseDateKey,
  toDateKey,
  todayKey,
  validateRange,
} from "./dates";
import { notifyBookingCancelled, notifyBookingCreated, notifyRequestFulfilled } from "./notify";

/**
 * THE domain module. lib/loans.ts is the only place allowed to create
 * bookings and ledger entries — server actions and the seed script all go
 * through here, so points can never drift out of sync with availability.
 *
 * Conventions:
 * - Functions that only read are named getSomething or quoteSomething.
 *   Functions that write throw BookingError with a message safe to show.
 * - Dates cross the boundary as "YYYY-MM-DD" keys (see lib/dates.ts).
 */

export class BookingError extends Error {}

// ---------------------------------------------------------------------------
// Balances & ledger
// ---------------------------------------------------------------------------

/** Balance = welcome entry + every movement. Never stored, always summed. */
export async function getBalance(userId: number): Promise<number> {
  const result = await prisma.ledgerEntry.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

/** Writes the +10 welcome entry once. Called whenever a user is created. */
export async function ensureWelcomeEntry(userId: number): Promise<void> {
  const existing = await prisma.ledgerEntry.count({ where: { userId } });
  if (existing === 0) {
    await prisma.ledgerEntry.create({
      data: {
        userId,
        amount: WELCOME_POINTS,
        reason: LEDGER_REASON.WELCOME,
        balanceAfter: WELCOME_POINTS,
      },
    });
  }
}

async function appendLedgerEntry(
  tx: Prisma.TransactionClient,
  args: { userId: number; amount: number; reason: string; bookingId?: number },
): Promise<void> {
  const balance = await tx.ledgerEntry.aggregate({
    where: { userId: args.userId },
    _sum: { amount: true },
  });
  const current = balance._sum.amount ?? 0;
  await tx.ledgerEntry.create({
    data: {
      userId: args.userId,
      amount: args.amount,
      reason: args.reason,
      bookingId: args.bookingId,
      balanceAfter: current + args.amount,
    },
  });
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

export interface Quote {
  ok: true;
  days: number;
  pointsTotal: number;
  borrowerBalance: number;
}

export interface Rejection {
  ok: false;
  error: string;
}

/**
 * Dry-run of a booking: validates everything createBooking would, but
 * writes nothing. Powers the "available / not available + price" verdict
 * on the offer page.
 */
export async function quoteBooking(
  offerId: number,
  borrowerId: number,
  fromKey: string,
  toKey: string,
): Promise<Quote | Rejection> {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: {
      size: true,
      bookings: { where: { status: { not: BOOKING_STATUS.CANCELLED } } },
    },
  });
  if (!offer) return { ok: false, error: "This offer no longer exists." };
  if (offer.ownerId === borrowerId) {
    return { ok: false, error: "You cannot borrow your own item." };
  }

  const rangeError = validateRange(fromKey, toKey);
  if (rangeError) return { ok: false, error: rangeError };

  if (fromKey < toDateKey(offer.availableFrom) || toKey > toDateKey(offer.availableUntil)) {
    return {
      ok: false,
      error: `This item is only available ${toDateKey(offer.availableFrom)} – ${toDateKey(offer.availableUntil)}.`,
    };
  }

  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  const clash = offer.bookings.find(
    (b) => from < b.to && b.from < to, // end-exclusive overlap
  );
  if (clash) {
    return {
      ok: false,
      error: `Already promised to someone else for ${toDateKey(clash.from)} – ${toDateKey(clash.to)}. Pick other days.`,
    };
  }

  const days = nightsBetween(from, to);
  const pointsTotal = days * offer.size.pointsPerDay;
  const borrowerBalance = await getBalance(borrowerId);
  if (borrowerBalance < pointsTotal) {
    return {
      ok: false,
      error: `You need ${pointsTotal} points for the whole period, but you have ${borrowerBalance}. Lend something first!`,
    };
  }
  return { ok: true, days, pointsTotal, borrowerBalance };
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export interface CreateBookingInput {
  offerId: number;
  borrowerId: number;
  fromKey: string;
  toKey: string;
  /** Set when this booking fulfils an open request ("I have this"). */
  sourceRequestId?: number;
}

/**
 * Books an offer for [fromKey, toKey] and moves the points immediately:
 * borrower −X, lender +X, in one transaction. Throws BookingError otherwise.
 */
export async function createBooking(input: CreateBookingInput): Promise<number> {
  const quote = await quoteBooking(input.offerId, input.borrowerId, input.fromKey, input.toKey);
  if (!quote.ok) throw new BookingError(quote.error);

  let request: LoanRequest | null = null;
  if (input.sourceRequestId !== undefined) {
    request = await prisma.request.findUnique({ where: { id: input.sourceRequestId } });
    if (!request) throw new BookingError("The request you are answering no longer exists.");
    if (request.status !== REQUEST_STATUS.OPEN) {
      throw new BookingError("This request was already answered.");
    }
    if (request.requesterId !== input.borrowerId) {
      throw new BookingError("A booking can only be made for the person who posted the request.");
    }
    if (request.periodFrom && request.periodUntil) {
      const wantedFrom = toDateKey(request.periodFrom);
      const wantedUntil = toDateKey(request.periodUntil);
      if (wantedFrom !== input.fromKey || wantedUntil !== input.toKey) {
        throw new BookingError(
          `This request asks for ${wantedFrom} – ${wantedUntil}. Book exactly those days.`,
        );
      }
    }
  }

  const from = parseDateKey(input.fromKey);
  const to = parseDateKey(input.toKey);
  const today = todayKey();
  const initialStatus =
    toDateKey(to) <= today
      ? BOOKING_STATUS.COMPLETED
      : toDateKey(from) <= today
        ? BOOKING_STATUS.ACTIVE
        : BOOKING_STATUS.UPCOMING;

  const created = await prisma.$transaction(async (tx) => {
    // Re-check inside the transaction: the quote above is a read, and two
    // borrowers could otherwise book the same nights concurrently.
    const clash = await tx.booking.findFirst({
      where: {
        offerId: input.offerId,
        status: { not: BOOKING_STATUS.CANCELLED },
        from: { lt: to },
        to: { gt: from },
      },
    });
    if (clash) throw new BookingError("Someone just booked these days. Pick other days.");

    const booking = await tx.booking.create({
      data: {
        offerId: input.offerId,
        borrowerId: input.borrowerId,
        from,
        to,
        days: quote.days,
        pointsTotal: quote.pointsTotal,
        status: initialStatus,
      },
      include: { offer: { include: { owner: true } }, borrower: true },
    });

    await appendLedgerEntry(tx, {
      userId: input.borrowerId,
      amount: -quote.pointsTotal,
      reason: LEDGER_REASON.BORROW,
      bookingId: booking.id,
    });
    await appendLedgerEntry(tx, {
      userId: booking.offer.ownerId,
      amount: quote.pointsTotal,
      reason: LEDGER_REASON.LEND,
      bookingId: booking.id,
    });

    if (request) {
      await tx.request.update({
        where: { id: request.id },
        data: { status: REQUEST_STATUS.FULFILLED, fulfillingBookingId: booking.id },
      });
    }
    return booking;
  });

  notifyBookingCreated({
    lenderEmail: created.offer.owner.email,
    lenderName: created.offer.owner.name,
    borrowerName: created.borrower.name,
    offerTitle: created.offer.title,
    rangeLabel: `${input.fromKey} – ${input.toKey}`,
    points: created.pointsTotal,
  });
  if (request) {
    const requester = await prisma.user.findUniqueOrThrow({ where: { id: request.requesterId } });
    notifyRequestFulfilled({
      requesterEmail: requester.email,
      requesterName: requester.name,
      lenderName: created.offer.owner.name,
      requestTitle: created.offer.title,
      rangeLabel: `${input.fromKey} – ${input.toKey}`,
    });
  }
  return created.id;
}

/**
 * Cancels an upcoming booking (borrower or lender). Points are returned
 * with mirror ledger entries — history is never rewritten. A fulfilled
 * request is reopened.
 */
export async function cancelBooking(bookingId: number, actorId: number): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      offer: { include: { owner: true } },
      borrower: true,
      fulfilledRequest: true,
    },
  });
  if (!booking) throw new BookingError("This booking no longer exists.");
  if (booking.status === BOOKING_STATUS.CANCELLED) throw new BookingError("Already cancelled.");
  if (booking.status !== BOOKING_STATUS.UPCOMING) {
    throw new BookingError("Only upcoming bookings can be cancelled.");
  }
  if (booking.borrowerId !== actorId && booking.offer.ownerId !== actorId) {
    throw new BookingError("Only the borrower or the lender can cancel this booking.");
  }

  const actor = booking.borrowerId === actorId ? booking.borrower : booking.offer.owner;
  const other = booking.borrowerId === actorId ? booking.offer.owner : booking.borrower;

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: BOOKING_STATUS.CANCELLED },
    });
    await appendLedgerEntry(tx, {
      userId: booking.borrowerId,
      amount: booking.pointsTotal,
      reason: LEDGER_REASON.REFUND_BORROW,
      bookingId: booking.id,
    });
    await appendLedgerEntry(tx, {
      userId: booking.offer.ownerId,
      amount: -booking.pointsTotal,
      reason: LEDGER_REASON.REFUND_LEND,
      bookingId: booking.id,
    });
    if (booking.fulfilledRequest) {
      await tx.request.update({
        where: { id: booking.fulfilledRequest.id },
        data: { status: REQUEST_STATUS.OPEN, fulfillingBookingId: null },
      });
    }
  });

  notifyBookingCancelled({
    otherPartyEmail: other.email,
    otherPartyName: other.name,
    cancelledByName: actor.name,
    offerTitle: booking.offer.title,
    rangeLabel: `${toDateKey(booking.from)} – ${toDateKey(booking.to)}`,
    pointsRefunded: booking.pointsTotal,
  });
}

/** Rolls upcoming → active → completed by date. Cheap; call on reads. */
export async function syncBookingStatuses(): Promise<void> {
  const today = todayKey();
  await prisma.booking.updateMany({
    where: { status: BOOKING_STATUS.UPCOMING, from: { lte: parseDateKey(today) } },
    data: { status: BOOKING_STATUS.ACTIVE },
  });
  await prisma.booking.updateMany({
    where: {
      status: { in: [BOOKING_STATUS.UPCOMING, BOOKING_STATUS.ACTIVE] },
      to: { lte: parseDateKey(today) },
    },
    data: { status: BOOKING_STATUS.COMPLETED },
  });
}

// ---------------------------------------------------------------------------
// Offers & requests
// ---------------------------------------------------------------------------

export interface CreateOfferInput {
  ownerId: number;
  title: string;
  description?: string;
  sizeKey: string;
  neighbourhood: string;
  availableFromKey: string;
  availableUntilKey: string;
  phenomenonIds: number[];
  photoPath?: string;
}

export async function createOffer(input: CreateOfferInput): Promise<number> {
  const title = input.title.trim();
  if (!title) throw new BookingError("Give your item a name.");
  if (input.phenomenonIds.length === 0) {
    throw new BookingError("Pick at least one phenomenon your item helps with.");
  }
  const rangeError = validateRange(input.availableFromKey, input.availableUntilKey);
  if (rangeError) throw new BookingError(rangeError);

  const size = await prisma.sizeCategory.findUnique({ where: { key: input.sizeKey } });
  if (!size) throw new BookingError("Pick a size category.");
  const phenomena = await prisma.phenomenon.findMany({
    where: { id: { in: input.phenomenonIds } },
  });
  if (phenomena.length !== input.phenomenonIds.length) {
    throw new BookingError("One of the chosen phenomena does not exist.");
  }

  const offer = await prisma.offer.create({
    data: {
      ownerId: input.ownerId,
      title,
      description: input.description?.trim() || null,
      sizeId: size.id,
      neighbourhood: input.neighbourhood.trim() || "Zurich",
      availableFrom: parseDateKey(input.availableFromKey),
      availableUntil: parseDateKey(input.availableUntilKey),
      photoPath: input.photoPath ?? null,
      phenomena: { connect: input.phenomenonIds.map((id) => ({ id })) },
    },
  });
  return offer.id;
}

export interface CreateRequestInput {
  requesterId: number;
  title: string;
  phenomenonId: number;
  neighbourhood: string;
  note?: string;
  periodNote?: string;
  periodFromKey?: string;
  periodUntilKey?: string;
}

export async function createRequest(input: CreateRequestInput): Promise<number> {
  const title = input.title.trim();
  if (!title) throw new BookingError("Say what you need.");
  const phenomenon = await prisma.phenomenon.findUnique({ where: { id: input.phenomenonId } });
  if (!phenomenon) throw new BookingError("Pick a phenomenon.");

  const hasFrom = !!input.periodFromKey;
  const hasUntil = !!input.periodUntilKey;
  if (hasFrom !== hasUntil) {
    throw new BookingError("Set both a start and an end day, or neither.");
  }
  if (hasFrom && hasUntil) {
    const rangeError = validateRange(input.periodFromKey!, input.periodUntilKey!);
    if (rangeError) throw new BookingError(rangeError);
  }

  const request = await prisma.request.create({
    data: {
      requesterId: input.requesterId,
      title,
      phenomenonId: phenomenon.id,
      neighbourhood: input.neighbourhood.trim() || "Zurich",
      note: input.note?.trim() || null,
      periodNote: input.periodNote?.trim() || null,
      periodFrom: hasFrom ? parseDateKey(input.periodFromKey!) : null,
      periodUntil: hasUntil ? parseDateKey(input.periodUntilKey!) : null,
    },
  });
  return request.id;
}

// ---------------------------------------------------------------------------
// Reads for pages
// ---------------------------------------------------------------------------

/** Full points history, newest first, with the offer behind each movement. */
export async function getLedger(userId: number) {
  return prisma.ledgerEntry.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      booking: {
        include: {
          offer: { include: { owner: true, size: true } },
          borrower: true,
        },
      },
    },
  });
}

export type DashboardData = {
  offers: Awaited<ReturnType<typeof getMyOffers>>;
  requests: Awaited<ReturnType<typeof getMyRequests>>;
  borrowing: Awaited<ReturnType<typeof getMyBorrowings>>;
  lendingOut: Awaited<ReturnType<typeof getMyLendingsOut>>;
  balance: number;
};

async function getMyOffers(userId: number) {
  return prisma.offer.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      size: true,
      phenomena: true,
      bookings: {
        where: { status: { not: BOOKING_STATUS.CANCELLED } },
        include: { borrower: true },
        orderBy: { from: "asc" },
      },
    },
  });
}

async function getMyRequests(userId: number) {
  return prisma.request.findMany({
    where: { requesterId: userId },
    orderBy: { createdAt: "desc" },
    include: { phenomenon: true },
  });
}

async function getMyBorrowings(userId: number) {
  return prisma.booking.findMany({
    where: { borrowerId: userId, status: { not: BOOKING_STATUS.CANCELLED } },
    orderBy: { from: "asc" },
    include: { offer: { include: { owner: true, size: true } } },
  });
}

async function getMyLendingsOut(userId: number) {
  return prisma.booking.findMany({
    where: { offer: { ownerId: userId }, status: { not: BOOKING_STATUS.CANCELLED } },
    orderBy: { from: "asc" },
    include: { offer: { include: { size: true } }, borrower: true },
  });
}

export async function getDashboard(userId: number): Promise<DashboardData> {
  await syncBookingStatuses();
  const [offers, requests, borrowing, lendingOut, balance] = await Promise.all([
    getMyOffers(userId),
    getMyRequests(userId),
    getMyBorrowings(userId),
    getMyLendingsOut(userId),
    getBalance(userId),
  ]);
  return { offers, requests, borrowing, lendingOut, balance };
}

/** True when a booking may still be cancelled (upcoming, not cancelled). */
export function isCancellable(status: string): boolean {
  return status === BOOKING_STATUS.UPCOMING;
}

/** Earliest due-back date among active/upcoming borrowings, if any. */
export function nextDueBack<T extends { status: string; to: Date }>(
  borrowings: T[],
): T | null {
  const open = borrowings.filter((b) => bookingBlocksDates(b.status));
  if (open.length === 0) return null;
  return open.reduce((a, b) => (a.to < b.to ? a : b));
}
