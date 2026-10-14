import Link from "next/link";

/**
 * Sprint 2 stretch goal (tender: explicitly nice-to-have, accepted without).
 * All data it needs already exists — bookings with [from, to] ranges per
 * offer — so this page only adds the month-grid presentation.
 */
export default function Calendar() {
  return (
    <div className="max-w-xl">
      <p className="text-xs font-semibold tracking-widest text-stone-500 uppercase">
        Nice to have · only if time permits
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Calendar view</h1>
      <p className="mt-2 text-stone-600">
        Upcoming and active loans in one month view, so nobody double-books an item or
        forgets to give it back. An item that is already promised to someone else cannot
        be requested for the same days — that rule is already enforced when booking.
      </p>
      <p className="mt-2 text-stone-600">
        Planned for Sprint 2. Until then, see what&apos;s promised where on each{" "}
        <Link href="/" className="font-semibold underline">
          offer page
        </Link>{" "}
        (“Already promised for”) and everything of yours on the{" "}
        <Link href="/dashboard" className="font-semibold underline">
          dashboard
        </Link>
        .
      </p>
    </div>
  );
}
