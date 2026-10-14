import Link from "next/link";
import { Photo } from "./Photo";
import { availabilityLabel } from "@/lib/dates";

export interface OfferCardData {
  id: number;
  title: string;
  ownerName: string;
  neighbourhood: string;
  photoPath: string | null;
  sizeLabel: string;
  pointsPerDay: number;
  availableFrom: Date;
  availableUntil: Date;
  phenomena: string[];
}

function pointsLabel(pointsPerDay: number): string {
  return pointsPerDay === 1 ? "1 pt per day" : `${pointsPerDay} pts per day`;
}

/** One offer tile, mockup screen 1. First phenomenon is primary. */
export function OfferCard({ offer, preview = false }: { offer: OfferCardData; preview?: boolean }) {
  const [primary, ...also] = offer.phenomena;
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="border-b border-stone-100 bg-stone-50 px-3 py-1.5 text-xs font-semibold">
        {primary ?? "Pick a phenomenon below"} · {pointsLabel(offer.pointsPerDay)}
        {also.length > 0 && (
          <span className="font-normal text-stone-500"> · Also: {also.join(", ")}</span>
        )}
      </div>
      <Photo src={offer.photoPath} title={offer.title} className="h-32 w-full" />
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="font-semibold">{offer.title}</h3>
        <p className="text-sm text-stone-500">
          {offer.ownerName} · {offer.neighbourhood}
        </p>
        <p className="text-sm text-stone-500">
          Available: {availabilityLabel(offer.availableFrom, offer.availableUntil)}
        </p>
        <p className="text-xs text-stone-400">
          {offer.sizeLabel} item
        </p>
        {preview ? (
          <span className="mt-2 rounded-lg bg-stone-200 px-3 py-1.5 text-center text-sm font-semibold text-stone-500">
            Request
          </span>
        ) : (
          <Link
            href={`/offers/${offer.id}`}
            className="mt-2 rounded-lg bg-stone-900 px-3 py-1.5 text-center text-sm font-semibold text-white hover:bg-stone-700"
          >
            Request
          </Link>
        )}
      </div>
    </article>
  );
}
