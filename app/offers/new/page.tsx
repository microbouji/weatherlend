import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { REQUEST_STATUS } from "@/lib/domain";
import { OfferForm, type OfferPrefill } from "@/components/OfferForm";

interface Props {
  searchParams: Promise<{ fromRequest?: string }>;
}

export default async function NewOffer({ searchParams }: Props) {
  const { fromRequest } = await searchParams;
  const [user, phenomena, sizes] = await Promise.all([
    getCurrentUser(),
    prisma.phenomenon.findMany({ orderBy: { id: "asc" } }),
    prisma.sizeCategory.findMany({ orderBy: { pointsPerDay: "asc" } }),
  ]);

  let prefill: OfferPrefill | undefined;
  if (fromRequest) {
    const request = await prisma.request.findUnique({
      where: { id: Number(fromRequest) },
      include: { requester: true },
    });
    if (!request || request.status !== REQUEST_STATUS.OPEN || request.requesterId === user.id) {
      redirect("/requests");
    }
    prefill = {
      sourceRequestId: request.id,
      requesterName: request.requester.name,
      title: request.title,
      phenomenonId: request.phenomenonId,
      neighbourhood: request.neighbourhood,
      periodFrom: request.periodFrom?.toISOString().slice(0, 10) ?? null,
      periodUntil: request.periodUntil?.toISOString().slice(0, 10) ?? null,
      periodNote: request.periodNote,
    };
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <p className="text-xs font-semibold tracking-widest text-stone-500 uppercase">
          Onboarding · Step 1 of 2
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">What can you lend?</h1>
        <p className="mt-2 text-stone-600">
          List what sits unused in your flat. For every day someone borrows it, you earn
          points you can spend later.
        </p>
      </div>
      <OfferForm
        phenomena={phenomena}
        sizes={sizes}
        userName={user.name}
        neighbourhood={user.neighbourhood}
        prefill={prefill}
      />
      <p className="text-sm text-stone-500">
        Next:{" "}
        <Link href="/onboarding/step-2" className="font-semibold underline">
          step 2 of onboarding
        </Link>
        .
      </p>
    </div>
  );
}
