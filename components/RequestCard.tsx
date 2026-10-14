import Link from "next/link";
import { formatRange, nightsBetween } from "@/lib/dates";

export interface RequestCardData {
  id: number;
  title: string;
  phenomenonName: string;
  requesterName: string;
  neighbourhood: string;
  note: string | null;
  periodFrom: Date | null;
  periodUntil: Date | null;
  periodNote: string | null;
}

function periodLabel(request: RequestCardData): string {
  if (request.periodFrom && request.periodUntil) {
    return formatRange(request.periodFrom, request.periodUntil);
  }
  return request.periodNote ?? "Flexible dates";
}

/**
 * One open request, mockup screen 3. Without a concrete item the size (and
 * so the exact price) is unknown — the card shows nights plus the possible
 * range (1 pt/day small … 3 pts/day large) instead of inventing a total.
 */
export function RequestCard({ request, mine }: { request: RequestCardData; mine: boolean }) {
  const nights =
    request.periodFrom && request.periodUntil
      ? nightsBetween(request.periodFrom, request.periodUntil)
      : null;
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{request.title}</h3>
        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
          {request.phenomenonName}
        </span>
      </div>
      <p className="mt-1 text-sm text-stone-500">
        {request.requesterName} · {request.neighbourhood}
      </p>
      <p className="mt-1 text-sm">
        Period: {periodLabel(request)}
        {nights !== null && (
          <span className="text-stone-500">
            {" "}· {nights} {nights === 1 ? "night" : "nights"} ({nights}–{nights * 3} points,
            depending on item size)
          </span>
        )}
      </p>
      {request.note && <p className="mt-1 text-sm text-stone-600">{request.note}</p>}
      {!mine && (
        <Link
          href={`/offers/new?fromRequest=${request.id}`}
          className="mt-3 inline-block rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-stone-700"
        >
          I have this
        </Link>
      )}
    </article>
  );
}
