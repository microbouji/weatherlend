"use client";

import { useActionState, useState, useTransition } from "react";
import { bookOffer, quoteForOffer, type FormState } from "@/app/actions";

interface Props {
  offerId: number;
  pointsPerDay: number;
  minKey: string;
  maxKey: string;
  defaultFrom: string;
  defaultTo: string;
}

type Verdict =
  | { kind: "idle" }
  | { kind: "ok"; days: number; pointsTotal: number; balance: number }
  | { kind: "no"; error: string };

/**
 * Hotel-style booking: pick dates, get an availability + price verdict,
 * then book. Booking moves the points immediately (tender §4).
 */
export function BookingForm({ offerId, pointsPerDay, minKey, maxKey, defaultFrom, defaultTo }: Props) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [verdict, setVerdict] = useState<Verdict>({ kind: "idle" });
  const [checking, startChecking] = useTransition();
  const [state, bookAction, booking] = useActionState<FormState, FormData>(bookOffer, {});

  function check(event: React.FormEvent): void {
    event.preventDefault();
    setVerdict({ kind: "idle" });
    startChecking(async () => {
      const result = await quoteForOffer(offerId, from, to);
      setVerdict(
        result.ok
          ? { kind: "ok", days: result.days, pointsTotal: result.pointsTotal, balance: result.borrowerBalance }
          : { kind: "no", error: result.error },
      );
    });
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="font-semibold">Request this item</h2>
      <form onSubmit={check} className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          From
          <input
            type="date"
            value={from}
            min={minKey}
            max={maxKey}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-stone-300 px-2 py-1.5"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Until
          <input
            type="date"
            value={to}
            min={minKey}
            max={maxKey}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-stone-300 px-2 py-1.5"
            required
          />
        </label>
        <button
          type="submit"
          disabled={checking}
          className="rounded-lg border border-stone-900 px-4 py-1.5 text-sm font-semibold hover:bg-stone-100 disabled:opacity-50"
        >
          {checking ? "Checking…" : "Check availability"}
        </button>
      </form>

      {verdict.kind === "ok" && (
        <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-900">
          <p className="font-semibold">Available ✓</p>
          <p>
            {verdict.days} {verdict.days === 1 ? "night" : "nights"} × {pointsPerDay}{" "}
            {pointsPerDay === 1 ? "pt" : "pts"} = <strong>{verdict.pointsTotal} points</strong>.
            You have {verdict.balance}.
          </p>
          <form action={bookAction} className="mt-2">
            <input type="hidden" name="offerId" value={offerId} />
            <input type="hidden" name="from" value={from} />
            <input type="hidden" name="to" value={to} />
            <button
              type="submit"
              disabled={booking}
              className="rounded-lg bg-stone-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-50"
            >
              {booking ? "Booking…" : `Book now for ${verdict.pointsTotal} points`}
            </button>
          </form>
        </div>
      )}
      {verdict.kind === "no" && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-900">{verdict.error}</p>
      )}
      {state.error && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-900">{state.error}</p>
      )}
      <p className="mt-3 text-xs text-stone-500">
        Booking is final for the prototype: points move immediately and the lender is
        notified by email in the full version.
      </p>
    </div>
  );
}
