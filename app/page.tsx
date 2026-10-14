import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { OfferCard, type OfferCardData } from "@/components/OfferCard";

interface Props {
  searchParams: Promise<{ p?: string }>;
}

/** Parses "?p=1,3" into a set of phenomenon ids. Invalid values are ignored. */
function selectedIds(param: string | undefined, valid: Set<number>): number[] {
  if (!param) return [];
  return param
    .split(",")
    .map(Number)
    .filter((id) => valid.has(id));
}

function toggleHref(selected: number[], id: number): string {
  const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
  return next.length === 0 ? "/" : `/?p=${next.join(",")}`;
}

export default async function Home({ searchParams }: Props) {
  const { p } = await searchParams;
  const [phenomena, offers] = await Promise.all([
    prisma.phenomenon.findMany({
      orderBy: { id: "asc" },
      include: { _count: { select: { offers: true } } },
    }),
    prisma.offer.findMany({
      orderBy: { createdAt: "asc" },
      include: { owner: true, size: true, phenomena: { orderBy: { id: "asc" } } },
    }),
  ]);

  const valid = new Set(phenomena.map((ph) => ph.id));
  const selected = selectedIds(p, valid);
  const visible =
    selected.length === 0
      ? offers
      : offers.filter((offer) => offer.phenomena.some((ph) => selected.includes(ph.id)));

  const cards: OfferCardData[] = visible.map((offer) => ({
    id: offer.id,
    title: offer.title,
    ownerName: offer.owner.name,
    neighbourhood: offer.neighbourhood,
    photoPath: offer.photoPath,
    sizeLabel: offer.size.label,
    pointsPerDay: offer.size.pointsPerDay,
    availableFrom: offer.availableFrom,
    availableUntil: offer.availableUntil,
    phenomena: offer.phenomena.map((ph) => ph.name),
  }));

  return (
    <div className="flex flex-col gap-10">
      <section className="max-w-2xl">
        <p className="text-xs font-semibold tracking-widest text-stone-500 uppercase">
          For students in Zurich
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Borrow what the weather asks for.</h1>
        <p className="mt-3 text-stone-600">
          A fan during a heat wave, a heater in a draughty flat, a wet vacuum when the
          cellar floods. Students lend to each other instead of buying things they need
          twice a year. Lending earns points, borrowing spends them.
        </p>
      </section>

      <section>
        <h2 className="font-semibold">Filter by phenomenon</h2>
        <p className="text-sm text-stone-500">
          Pick one or more. Items can belong to several phenomena.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/"
            className={`rounded-full border px-3 py-1 text-sm font-medium ${
              selected.length === 0
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
            }`}
          >
            All phenomena
          </Link>
          {phenomena.map((ph) => {
            const active = selected.includes(ph.id);
            return (
              <Link
                key={ph.id}
                href={toggleHref(selected, ph.id)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-sm font-medium ${
                  active
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
                }`}
              >
                {ph.name} <span className="opacity-60">{ph._count.offers}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-semibold">
          {selected.length === 0
            ? "Everything the community currently offers"
            : `Matching ${selected
                .map((id) => phenomena.find((ph) => ph.id === id)?.name)
                .join(", ")}`}
        </h2>
        <p className="text-sm text-stone-500">
          {cards.length} {cards.length === 1 ? "item" : "items"} available. Pick a
          phenomenon above to narrow it down.
        </p>
        {cards.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-500">
            Nothing matches this combination yet. Try fewer phenomena — or post a
            request below and someone may offer it.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl bg-stone-900 p-6 text-white">
        <h2 className="font-semibold">Nothing suitable? Post what you need and for which days.</h2>
        <Link
          href="/requests"
          className="mt-3 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-stone-900 hover:bg-stone-200"
        >
          Post a request
        </Link>
      </section>

      <section>
        <h2 className="font-semibold">How it works</h2>
        <ol className="mt-3 grid gap-4 md:grid-cols-3">
          {[
            ["1 · Offer", "List what you would lend, which phenomena it helps with, and when it is free."],
            ["2 · Request", "Filter by phenomenon, pick an offer and a period — or post a request if nothing fits."],
            ["3 · Keep the balance", "Points per day by size: small 1, medium 2, large 3. Lending adds them, borrowing deducts them. Everyone starts with 10."],
          ].map(([title, body]) => (
            <li key={title} className="rounded-xl border border-stone-200 bg-white p-4">
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-sm text-stone-600">{body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-stone-500">
          Phenomena are data, so more can be added without code changes.
        </p>
      </section>
    </div>
  );
}
