"use client";

import { useActionState, useState } from "react";
import { createOfferAction, type FormState } from "@/app/actions";
import { OfferCard } from "@/components/OfferCard";
import { SCHOOL_YEAR_END_KEY, SCHOOL_YEAR_START_KEY } from "@/lib/dates";

export interface OfferPrefill {
  sourceRequestId: number;
  requesterName: string;
  title: string;
  phenomenonId: number;
  neighbourhood: string;
  periodFrom: string | null;
  periodUntil: string | null;
  periodNote: string | null;
}

interface Props {
  phenomena: { id: number; name: string }[];
  sizes: { key: string; label: string; pointsPerDay: number }[];
  userName: string;
  neighbourhood: string;
  prefill?: OfferPrefill;
}

/**
 * "What can you lend?" — mockup screen 2. Same form is reused for
 * "I have this" (prefilled from a request), in which case publishing
 * immediately books the request's days.
 */
export function OfferForm({ phenomena, sizes, userName, neighbourhood, prefill }: Props) {
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [description, setDescription] = useState("");
  const [sizeKey, setSizeKey] = useState("small");
  const [hood, setHood] = useState(prefill?.neighbourhood ?? neighbourhood);
  const [from, setFrom] = useState(prefill?.periodFrom ?? SCHOOL_YEAR_START_KEY);
  const [to, setTo] = useState(prefill?.periodUntil ?? SCHOOL_YEAR_END_KEY);
  const [picked, setPicked] = useState<number[]>(
    prefill ? [prefill.phenomenonId] : [],
  );
  const [photoName, setPhotoName] = useState("");
  const [state, submit, submitting] = useActionState<FormState, FormData>(createOfferAction, {});

  const size = sizes.find((s) => s.key === sizeKey) ?? sizes[0];
  const pickedNames = phenomena.filter((ph) => picked.includes(ph.id)).map((ph) => ph.name);

  function toggle(id: number): void {
    setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form action={submit} className="flex flex-col gap-4">
        {prefill && (
          <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            Answering <strong>{prefill.requesterName}</strong>&apos;s request. Publishing
            {prefill.periodFrom && prefill.periodUntil ? (
              <>
                {" "}immediately books it for them,{" "}
                <strong>
                  {prefill.periodFrom} – {prefill.periodUntil}
                </strong>
                .
              </>
            ) : (
              <> immediately books it for the days you pick below.</>
            )}
            <input type="hidden" name="sourceRequestId" value={prefill.sourceRequestId} />
          </div>
        )}
        <label className="flex flex-col gap-1 text-sm font-medium">
          Item
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Fan heater 2000 W"
            className="rounded-lg border border-stone-300 px-3 py-2 font-normal"
            required
          />
        </label>
        <fieldset>
          <legend className="text-sm font-medium">Which phenomena does it help with?</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {phenomena.map((ph) => (
              <label
                key={ph.id}
                className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${
                  picked.includes(ph.id)
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-300 bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  name="phenomena"
                  value={ph.id}
                  checked={picked.includes(ph.id)}
                  onChange={() => toggle(ph.id)}
                  className="sr-only"
                />
                {ph.name}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-medium">Size category and point value</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {sizes.map((s) => (
              <label
                key={s.key}
                className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${
                  sizeKey === s.key
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="size"
                  value={s.key}
                  checked={sizeKey === s.key}
                  onChange={() => setSizeKey(s.key)}
                  className="sr-only"
                />
                {s.label} · {s.pointsPerDay} {s.pointsPerDay === 1 ? "pt" : "pts"}/day
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Available from
            <input
              type="date"
              name="availableFrom"
              value={from}
              min={SCHOOL_YEAR_START_KEY}
              max={SCHOOL_YEAR_END_KEY}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-stone-300 px-2 py-1.5 font-normal"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Available until
            <input
              type="date"
              name="availableUntil"
              value={to}
              min={SCHOOL_YEAR_START_KEY}
              max={SCHOOL_YEAR_END_KEY}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-stone-300 px-2 py-1.5 font-normal"
              required
            />
          </label>
        </div>
        {prefill && !prefill.periodFrom && (
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-dashed border-stone-300 p-3">
            <p className="col-span-2 text-sm text-stone-600">
              “{prefill.periodNote ?? "Flexible dates"}” — pick the days you book it for:
            </p>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Book from
              <input
                type="date"
                name="bookFrom"
                min={SCHOOL_YEAR_START_KEY}
                max={SCHOOL_YEAR_END_KEY}
                className="rounded-lg border border-stone-300 px-2 py-1.5 font-normal"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Book until
              <input
                type="date"
                name="bookTo"
                min={SCHOOL_YEAR_START_KEY}
                max={SCHOOL_YEAR_END_KEY}
                className="rounded-lg border border-stone-300 px-2 py-1.5 font-normal"
                required
              />
            </label>
          </div>
        )}
        <label className="flex flex-col gap-1 text-sm font-medium">
          Neighbourhood
          <input
            name="neighbourhood"
            value={hood}
            onChange={(e) => setHood(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Description <span className="font-normal text-stone-500">(optional)</span>
          <textarea
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="rounded-lg border border-stone-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Photo <span className="font-normal text-stone-500">(optional)</span>
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? "")}
            className="rounded-lg border border-dashed border-stone-300 bg-white px-3 py-6 text-center font-normal"
          />
          {photoName && <span className="text-xs font-normal text-stone-500">{photoName}</span>}
        </label>
        {state.error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {submitting ? "Publishing…" : prefill ? "Publish and book it" : "Publish offer"}
        </button>
      </form>
      <div>
        <h2 className="text-sm font-medium text-stone-500">Preview</h2>
        <div className="mt-2 max-w-sm">
          <OfferCard
            preview
            offer={{
              id: 0,
              title: title || "Your item name",
              ownerName: userName,
              neighbourhood: hood || "Zurich",
              photoPath: null,
              sizeLabel: size.label,
              pointsPerDay: size.pointsPerDay,
              availableFrom: new Date(`${from}T00:00:00Z`),
              availableUntil: new Date(`${to}T00:00:00Z`),
              phenomena: pickedNames,
            }}
          />
        </div>
        <p className="mt-3 max-w-sm rounded-xl bg-stone-100 p-3 text-sm text-stone-600">
          For every day someone borrows it, you earn {size.pointsPerDay}{" "}
          {size.pointsPerDay === 1 ? "point" : "points"} you can spend later.
        </p>
      </div>
    </div>
  );
}
