"use client";

import { useActionState } from "react";
import { createRequestAction, type FormState } from "@/app/actions";

interface Props {
  phenomena: { id: number; name: string }[];
  neighbourhood: string;
  balance: number;
}

/** "What do you need, and when?" — mockup screen 3, top half. */
export function RequestForm({ phenomena, neighbourhood, balance }: Props) {
  const [state, submit, submitting] = useActionState<FormState, FormData>(
    createRequestAction,
    {},
  );
  return (
    <form action={submit} className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          I need
          <input
            name="title"
            placeholder="e.g. Fan heater"
            className="rounded-lg border border-stone-300 px-3 py-2 font-normal"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Phenomenon
          <select
            name="phenomenon"
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 font-normal"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Pick one
            </option>
            {phenomena.map((ph) => (
              <option key={ph.id} value={ph.id}>
                {ph.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          From <span className="font-normal text-stone-500">(optional if flexible)</span>
          <input
            type="date"
            name="periodFrom"
            className="rounded-lg border border-stone-300 px-2 py-1.5 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Until <span className="font-normal text-stone-500">(optional if flexible)</span>
          <input
            type="date"
            name="periodUntil"
            className="rounded-lg border border-stone-300 px-2 py-1.5 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Neighbourhood
          <input
            name="neighbourhood"
            defaultValue={neighbourhood}
            className="rounded-lg border border-stone-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Flexible timing? <span className="font-normal text-stone-500">(e.g. short notice)</span>
          <input
            name="periodNote"
            placeholder="e.g. next heat wave"
            className="rounded-lg border border-stone-300 px-3 py-2 font-normal"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Note <span className="font-normal text-stone-500">(optional)</span>
        <textarea
          name="note"
          rows={2}
          className="rounded-lg border border-stone-300 px-3 py-2 font-normal"
        />
      </label>
      <p className="text-sm text-stone-500">
        You need enough points for the whole period once someone books it for you. You
        currently have <strong>{balance}</strong>.
      </p>
      {state.error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-50"
      >
        {submitting ? "Posting…" : "Post request"}
      </button>
    </form>
  );
}
