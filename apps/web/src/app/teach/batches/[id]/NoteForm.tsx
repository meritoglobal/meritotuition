"use client";
import { useActionState } from "react";
import { growthCopy } from "@/lib/copy-growth";
import { useLang } from "@/lib/lang-client";
import type { FormState } from "../../actions";

export default function NoteForm({ action, note, rating }: { action: (s: FormState, f: FormData) => Promise<FormState>; note?: string; rating?: number | null }) {
  const c = growthCopy(useLang()).note;
  const [state, run, pending] = useActionState<FormState, FormData>(action, null);
  return (
    <details className="mt-1 text-xs">
      <summary className="cursor-pointer text-ink-2">✎ {c.h}{note ? " ✓" : ""}</summary>
      <form action={run} className="mt-2 space-y-2">
        <textarea name="note" required maxLength={1000} defaultValue={note} placeholder={c.ph} rows={2} className="w-full rounded-lg border border-line p-2 text-sm" />
        <div className="flex flex-wrap items-center gap-2">
          <select name="rating" defaultValue={rating ?? ""} className="rounded-lg border border-line px-2 py-1.5 text-sm" aria-label={c.rating}>
            <option value="">{c.rating}</option>
            {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{"★".repeat(r)} {c.stars[r]}</option>)}
          </select>
          <button disabled={pending} className="btn-board px-3! py-1.5! text-sm">{c.save}</button>
          {state?.ok && <span className="text-leaf">{c.saved}</span>}
        </div>
      </form>
    </details>
  );
}
