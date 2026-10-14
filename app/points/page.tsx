import Link from "next/link";
import { getCurrentUserId } from "@/lib/session";
import { getDashboard, getLedger, nextDueBack } from "@/lib/loans";
import { LEDGER_REASON, describeLedgerEntry } from "@/lib/domain";
import { formatDay } from "@/lib/dates";

export default async function Points() {
  const userId = await getCurrentUserId();
  const [entries, dashboard] = await Promise.all([getLedger(userId), getDashboard(userId)]);

  const starting = entries
    .filter((e) => e.reason === LEDGER_REASON.WELCOME)
    .reduce((sum, e) => sum + e.amount, 0);
  const earned = entries
    .filter((e) => e.amount > 0 && e.reason !== LEDGER_REASON.WELCOME)
    .reduce((sum, e) => sum + e.amount, 0);
  const spent = entries
    .filter((e) => e.amount < 0)
    .reduce((sum, e) => sum + e.amount, 0);
  const balance = starting + earned + spent;
  const dueBack = nextDueBack(dashboard.borrowing);

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My points account</h1>
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <p className="text-xs font-semibold tracking-widest text-stone-500 uppercase">Balance</p>
        <p className="text-4xl font-bold">{balance}</p>
        <dl className="mt-3 flex gap-6 text-sm">
          <div>
            <dt className="text-stone-500">Starting points</dt>
            <dd className="font-semibold">+{starting}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Earned by lending</dt>
            <dd className="font-semibold">+{earned}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Spent on borrowing</dt>
            <dd className="font-semibold">{spent}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">History</h2>
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => {
            const { verb, earned: isEarn } = describeLedgerEntry(entry.reason);
            const booking = entry.booking;
            const counterpart = booking
              ? entry.reason === LEDGER_REASON.LEND ||
                entry.reason === LEDGER_REASON.REFUND_LEND
                ? `To ${booking.borrower.name}`
                : `From ${booking.offer.owner.name}`
              : null;
            const detail = booking
              ? `${booking.offer.title} · ${booking.days} ${booking.days === 1 ? "day" : "days"} · ${booking.offer.size.label.toLowerCase()}`
              : "When signing up";
            return (
              <li
                key={entry.id}
                className="flex items-baseline justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3 text-sm"
              >
                <div>
                  <p className="font-semibold">
                    {verb} {counterpart && <span className="font-normal text-stone-500">{counterpart}</span>}
                  </p>
                  <p className="text-stone-500">{detail}</p>
                </div>
                <div className="text-right whitespace-nowrap">
                  <p className={`font-semibold ${isEarn ? "text-green-700" : "text-red-700"}`}>
                    {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                  </p>
                  <p className="text-xs text-stone-400">Balance: {entry.balanceAfter}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-4 text-sm">
        <h2 className="font-semibold">How we count</h2>
        <ul className="mt-1 text-stone-600">
          <li>Small (boots, lantern) — 1 pt per day</li>
          <li>Medium (fan, heater) — 2 pts per day</li>
          <li>Large (air conditioner, vacuum) — 3 pts per day</li>
        </ul>
        <p className="mt-2 text-stone-600">
          The borrower pays, the lender receives the same amount. That keeps the
          community balanced and nobody only takes.
        </p>
      </section>

      {dueBack && (
        <section className="rounded-xl bg-stone-900 p-4 text-sm text-white">
          <h2 className="font-semibold">Currently out</h2>
          <p className="mt-1">
            {dueBack.offer.title} from {dueBack.offer.owner.name}, due back on{" "}
            {formatDay(dueBack.to)}. {dueBack.days} {dueBack.days === 1 ? "day" : "days"} at{" "}
            {dueBack.offer.size.pointsPerDay}{" "}
            {dueBack.offer.size.pointsPerDay === 1 ? "pt" : "pts"} each.
          </p>
          <Link href="/calendar" className="mt-2 inline-block font-semibold underline">
            See my calendar
          </Link>
        </section>
      )}
    </div>
  );
}
