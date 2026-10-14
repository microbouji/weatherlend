import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { BOOKING_STATUS } from "@/lib/domain";
import { Photo } from "@/components/Photo";
import { BookingForm } from "@/components/BookingForm";
import { availabilityLabel, formatRange, toDateKey, todayKey } from "@/lib/dates";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OfferDetail({ params }: Props) {
  const { id } = await params;
  const offer = await prisma.offer.findUnique({
    where: { id: Number(id) },
    include: {
      owner: true,
      size: true,
      phenomena: { orderBy: { id: "asc" } },
      bookings: {
        where: { status: { not: BOOKING_STATUS.CANCELLED } },
        orderBy: { from: "asc" },
      },
    },
  });
  if (!offer) notFound();

  const userId = await getCurrentUserId();
  const isOwner = offer.ownerId === userId;
  const windowStart = toDateKey(offer.availableFrom);
  const windowEnd = toDateKey(offer.availableUntil);
  const today = todayKey();
  const defaultFrom = today < windowStart ? windowStart : today > windowEnd ? windowEnd : today;
  const defaultTo = defaultFrom >= windowEnd ? windowEnd : addDays(defaultFrom, 1);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="text-sm text-stone-500 hover:text-stone-900">
        ← All offers
      </Link>
      <div className="grid gap-6 md:grid-cols-2">
        <Photo src={offer.photoPath} title={offer.title} className="h-64 w-full rounded-xl" />
        <div>
          <div className="flex flex-wrap gap-1">
            {offer.phenomena.map((ph) => (
              <span
                key={ph.id}
                className="rounded-full bg-stone-900 px-2.5 py-0.5 text-xs font-semibold text-white"
              >
                {ph.name}
              </span>
            ))}
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{offer.title}</h1>
          <p className="mt-1 text-stone-500">
            {offer.owner.name} · {offer.neighbourhood} · {offer.size.label} item ·{" "}
            {offer.size.pointsPerDay} {offer.size.pointsPerDay === 1 ? "pt" : "pts"} per day
          </p>
          <p className="mt-1 text-stone-500">
            Available: {availabilityLabel(offer.availableFrom, offer.availableUntil)}
          </p>
          {offer.description && <p className="mt-3 text-stone-700">{offer.description}</p>}
          {offer.bookings.length > 0 && (
            <div className="mt-4 rounded-xl border border-stone-200 bg-white p-3 text-sm">
              <p className="font-semibold">Already promised for</p>
              <ul className="mt-1 list-disc pl-5 text-stone-600">
                {offer.bookings.map((b) => (
                  <li key={b.id}>{formatRange(b.from, b.to)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      {isOwner ? (
        <p className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
          This is your own item. Manage its bookings on your{" "}
          <Link href="/dashboard" className="font-semibold underline">
            dashboard
          </Link>
          .
        </p>
      ) : (
        <BookingForm
          offerId={offer.id}
          pointsPerDay={offer.size.pointsPerDay}
          minKey={windowStart}
          maxKey={windowEnd}
          defaultFrom={defaultFrom}
          defaultTo={defaultTo}
        />
      )}
    </div>
  );
}

function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}
