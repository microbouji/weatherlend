import Link from "next/link";
import { getCurrentUserId } from "@/lib/session";
import { cancelBookingAction } from "@/app/actions";
import { getDashboard, isCancellable } from "@/lib/loans";
import { BOOKING_STATUS } from "@/lib/domain";
import { availabilityLabel, formatRange } from "@/lib/dates";

interface Props {
  searchParams: Promise<{ booked?: string; offered?: string; cancelled?: string; error?: string }>;
}

function statusBadge(status: string): string {
  switch (status) {
    case BOOKING_STATUS.UPCOMING:
      return "bg-blue-100 text-blue-900";
    case BOOKING_STATUS.ACTIVE:
      return "bg-green-100 text-green-900";
    case BOOKING_STATUS.COMPLETED:
      return "bg-stone-100 text-stone-600";
    default:
      return "bg-stone-100 text-stone-600";
  }
}

export default async function Dashboard({ searchParams }: Props) {
  const { booked, offered, cancelled, error } = await searchParams;
  const userId = await getCurrentUserId();
  const { offers, requests, borrowing, lendingOut, balance } = await getDashboard(userId);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      {booked && (
        <p className="rounded-xl bg-green-50 p-3 text-sm text-green-900">
          Booked! Points moved immediately — see the history on your{" "}
          <Link href="/points" className="font-semibold underline">
            points page
          </Link>
          .
        </p>
      )}
      {offered && (
        <p className="rounded-xl bg-green-50 p-3 text-sm text-green-900">
          Offer published. It is now visible to the whole community.
        </p>
      )}
      {cancelled && (
        <p className="rounded-xl bg-green-50 p-3 text-sm text-green-900">
          Booking cancelled and points returned.
        </p>
      )}
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-900">{error}</p>
      )}

      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-stone-500 uppercase">
              Balance
            </p>
            <p className="text-3xl font-bold">{balance}</p>
          </div>
          <Link href="/points" className="text-sm font-semibold underline">
            Full history
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Borrowing</h2>
        {borrowing.length === 0 ? (
          <p className="text-sm text-stone-500">
            Nothing borrowed. <Link href="/" className="underline">Browse offers</Link>.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {borrowing.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-stone-200 bg-white p-3 text-sm"
              >
                <Link href={`/offers/${b.offerId}`} className="font-semibold hover:underline">
                  {b.offer.title}
                </Link>
                <span className="text-stone-500">
                  from {b.offer.owner.name} · {formatRange(b.from, b.to)} · −{b.pointsTotal} pts
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(b.status)}`}>
                  {b.status}
                </span>
                {isCancellable(b.status) && (
                  <form action={cancelBookingAction.bind(null, b.id)} className="ml-auto">
                    <button
                      type="submit"
                      className="rounded-lg border border-stone-300 px-2 py-0.5 text-xs font-semibold hover:bg-stone-100"
                    >
                      Cancel (points back)
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Lending out</h2>
        {lendingOut.length === 0 ? (
          <p className="text-sm text-stone-500">Nobody is borrowing your items right now.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {lendingOut.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-stone-200 bg-white p-3 text-sm"
              >
                <Link href={`/offers/${b.offerId}`} className="font-semibold hover:underline">
                  {b.offer.title}
                </Link>
                <span className="text-stone-500">
                  to {b.borrower.name} · {formatRange(b.from, b.to)} · +{b.pointsTotal} pts
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(b.status)}`}>
                  {b.status}
                </span>
                {isCancellable(b.status) && (
                  <form action={cancelBookingAction.bind(null, b.id)} className="ml-auto">
                    <button
                      type="submit"
                      className="rounded-lg border border-stone-300 px-2 py-0.5 text-xs font-semibold hover:bg-stone-100"
                    >
                      Cancel (points back)
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">My offers</h2>
          <Link href="/offers/new" className="text-sm font-semibold underline">
            Offer another item
          </Link>
        </div>
        {offers.length === 0 ? (
          <p className="text-sm text-stone-500">No offers yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {offers.map((o) => (
              <li key={o.id} className="rounded-xl border border-stone-200 bg-white p-3 text-sm">
                <Link href={`/offers/${o.id}`} className="font-semibold hover:underline">
                  {o.title}
                </Link>
                <span className="text-stone-500">
                  {" "}· {o.size.label} · {availabilityLabel(o.availableFrom, o.availableUntil)}
                </span>
                {o.bookings.length > 0 && (
                  <p className="mt-1 text-stone-500">
                    Promised:{" "}
                    {o.bookings
                      .map((b) => `${formatRange(b.from, b.to)} (${b.borrower.name})`)
                      .join("; ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">My requests</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-stone-500">
            No requests. <Link href="/requests" className="underline">Post one</Link>.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {requests.map((r) => (
              <li key={r.id} className="rounded-xl border border-stone-200 bg-white p-3 text-sm">
                <span className="font-semibold">{r.title}</span>
                <span className="text-stone-500"> · {r.phenomenon.name} · </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    r.status === "open"
                      ? "bg-amber-100 text-amber-900"
                      : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
