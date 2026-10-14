# AGENTS.md — Weatherlend prototype

Community lending platform for extreme weather (student team, Zurich).
Students lend/borrow items for weather events; a points economy replaces money.
Two-sprint delivery: Sprint 1 demo by 26 Oct 2026, final handover by 4 Nov 2026.

## Stack

Next.js App Router + TypeScript, Prisma + SQLite, Tailwind. One repo, one
command to run (`npm run setup`, `npm run dev`) — no accounts or services.
This prototype is the foundation for the follow-up version, not a throwaway:
SQLite → Postgres, demo-user → real auth, local uploads → object storage are
config-level swaps. Every such seam is marked `TODO(follow-up)` in code.

## Domain rules (enforced in code, not just displayed)

- **Phenomena and size categories are database rows**, never hard-coded
  (`Phenomenon`, `SizeCategory`). New phenomena need no code change.
- **Balance is derived**: welcome entry (+10) + `SUM(ledger)`. Never stored.
  `balanceAfter` is denormalized per row for cheap history rendering.
- **`lib/loans.ts` is the only module that may create bookings or ledger
  entries.** Server actions (`app/actions.ts`) and the seed go through it.
- **Booking moves points immediately** (borrower −X, lender +X) in one
  transaction. No accept step exists in this prototype.
- **[from, to] is bookable iff** it lies inside the offer's availability window
  AND overlaps no non-cancelled booking. Availability is always computed
  (`quoteBooking`), never stored. Re-checked inside the booking transaction.
- **Days are hotel nights**: end-exclusive, `to − from ≥ 1`.
- **All dates are clamped to the 2026/27 school year** (`lib/dates.ts`).
- **Cancelling** (upcoming bookings only) writes mirror refund entries and
  reopens a fulfilled request. History is never rewritten.

## Conventions

- Small, meaningful commits; `prisma/seed.ts` mirrors the client mockup
  (`docs/client-mockup.pdf`) and is the source of truth for demo content.
- Dates cross boundaries as `YYYY-MM-DD` keys, always UTC (`lib/dates.ts`).
- UI copy follows the mockup; deviations from it are deliberate and noted
  (e.g. request cards show nights + points range instead of inventing a total
  for an unknown item size).
- README stays minimal: local setup only. Design rationale lives here.

## Scope

- **Sprint 1 (this repo now):** landing + phenomenon filter, offer detail +
  hotel-style booking, offer form with live preview, requests + "I have this",
  dashboard + cancel/refund, points ledger, seeds, README. Onboarding step 2
  is an intentional TODO page (notifications are out of scope).
- **Sprint 2:** calendar month view (data already supports it), polish,
  handover. Sprints are accepted without the calendar (tender).
- **Follow-up (documented, never built here):** real auth, payments/deposits,
  insurance/liability, chat, reviews, real notifications, Postgres, storage.
  Seams: `lib/session.ts` (auth), `lib/notify.ts` (mail), `lib/photos.ts`
  (storage), `app/onboarding/step-2/page.tsx`, `app/calendar/page.tsx`.

## AI usage

AI coding assistants are used in this project (code generation and review).
All AI-generated code is reviewed, tested (domain suite + build + smoke test),
and committed by the developer, who remains responsible for quality and
correctness.
