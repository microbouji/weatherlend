import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getBalance } from "@/lib/loans";
import { getCurrentUser } from "@/lib/session";
import { REQUEST_STATUS } from "@/lib/domain";
import { RequestCard } from "@/components/RequestCard";
import { RequestForm } from "@/components/RequestForm";

interface Props {
  searchParams: Promise<{ p?: string; posted?: string }>;
}

export default async function Requests({ searchParams }: Props) {
  const { p, posted } = await searchParams;
  const [user, phenomena, requests] = await Promise.all([
    getCurrentUser(),
    prisma.phenomenon.findMany({ orderBy: { id: "asc" } }),
    prisma.request.findMany({
      where: { status: REQUEST_STATUS.OPEN },
      orderBy: { createdAt: "desc" },
      include: { requester: true, phenomenon: true },
    }),
  ]);
  const balance = await getBalance(user.id);

  const valid = new Set(phenomena.map((ph) => ph.id));
  const selected = p
    ? p
        .split(",")
        .map(Number)
        .filter((id) => valid.has(id))
    : [];
  const visible =
    selected.length === 0
      ? requests
      : requests.filter((r) => selected.includes(r.phenomenonId));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">What do you need, and when?</h1>
        <p className="mt-2 text-stone-600">
          Nothing suitable among the offers? Post a request. Whoever owns the item gets
          back to you.
        </p>
      </div>

      {posted && (
        <p className="rounded-xl bg-green-50 p-3 text-sm text-green-900">
          Request posted. It is now visible below for the whole community.
        </p>
      )}

      <section>
        <h2 className="mb-2 font-semibold">New request</h2>
        <RequestForm
          phenomena={phenomena}
          neighbourhood={user.neighbourhood}
          balance={balance}
        />
      </section>

      <section>
        <h2 className="font-semibold">Open requests</h2>
        <p className="text-sm text-stone-500">Filtered by phenomenon, same as the offers.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            href="/requests"
            className={`rounded-full border px-3 py-1 text-sm font-medium ${
              selected.length === 0
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
            }`}
          >
            All
          </Link>
          {phenomena.map((ph) => {
            const active = selected.includes(ph.id);
            const next = active
              ? selected.filter((s) => s !== ph.id)
              : [...selected, ph.id];
            return (
              <Link
                key={ph.id}
                href={next.length === 0 ? "/requests" : `/requests?p=${next.join(",")}`}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-sm font-medium ${
                  active
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
                }`}
              >
                {ph.name}
              </Link>
            );
          })}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {visible.map((r) => (
            <RequestCard
              key={r.id}
              mine={r.requesterId === user.id}
              request={{
                id: r.id,
                title: r.title,
                phenomenonName: r.phenomenon.name,
                requesterName: r.requester.name,
                neighbourhood: r.neighbourhood,
                note: r.note,
                periodFrom: r.periodFrom,
                periodUntil: r.periodUntil,
                periodNote: r.periodNote,
              }}
            />
          ))}
        </div>
        {visible.length === 0 && (
          <p className="mt-4 rounded-xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-500">
            No open requests{selected.length > 0 ? " for this phenomenon" : ""} right now.
          </p>
        )}
      </section>
    </div>
  );
}
