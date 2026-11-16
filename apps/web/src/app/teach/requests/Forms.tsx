"use client";
import { useActionState } from "react";
import { marketCopy } from "@/lib/copy-market";
import { L } from "@/lib/l10n";
import { useLang } from "@/lib/lang-client";
import type { TState } from "./actions";

type Act = (s: TState, f: FormData) => Promise<TState>;

export function PrefsForm({ action, areas, prefs }: { action: Act; areas: string[]; prefs: { open: boolean; notify: boolean; min_budget: number | null; extra_areas: string[] } }) {
  const lang = useLang();
  const c = marketCopy(lang).treq;
  const [state, run, pending] = useActionState<TState, FormData>(action, null);
  return (
    <form action={run} className="card grid gap-3 p-4 text-sm">
      <h2 className="font-semibold">{c.prefsH}</h2>
      <p className="text-xs text-ink-3">{c.prefsSub}</p>
      <label className="flex items-start gap-2"><input type="checkbox" name="open" defaultChecked={prefs.open} className="mt-1" />{c.openLabel}</label>
      <label className="flex items-start gap-2"><input type="checkbox" name="notify" defaultChecked={prefs.notify} className="mt-1" />{c.notify}</label>
      <label className="field"><span>{c.minBudget}</span><input name="min_budget" inputMode="numeric" defaultValue={prefs.min_budget ?? ""} /></label>
      <details>
        <summary className="cursor-pointer text-ink-2">{c.extra}{prefs.extra_areas.length ? ` (${L.num(prefs.extra_areas.length, lang)})` : ""}</summary>
        <div className="mt-2 grid grid-cols-2 gap-1">
          {areas.map((a) => <label key={a} className="flex gap-1.5"><input type="checkbox" name="extra" value={a} defaultChecked={prefs.extra_areas.includes(a)} />{L.area(a, lang)}</label>)}
        </div>
      </details>
      <button disabled={pending} className="btn-board">{c.save}</button>
      {state?.ok && <p className="text-leaf">{c.saved}</p>}
    </form>
  );
}

export function BidForm({ action, price, message, budget }: { action: Act; price?: number; message?: string | null; budget: number }) {
  const c = marketCopy(useLang()).treq;
  const [state, run, pending] = useActionState<TState, FormData>(action, null);
  return (
    <form action={run} className="card grid gap-3 p-4">
      <h2 className="font-semibold">{c.bidH}</h2>
      <label className="field"><span>{c.price}</span><input name="price" inputMode="numeric" required defaultValue={price ?? budget} /></label>
      <label className="field"><span>{c.msg}</span><textarea name="message" rows={3} maxLength={500} placeholder={c.msgPh} defaultValue={message ?? ""} /></label>
      <button disabled={pending} className="btn-gold">{price ? c.update : c.send}</button>
      {state?.ok && <p className="text-sm text-leaf">{c.sent}</p>}
      {state?.error && <p className="text-sm text-redpen">{c[state.error as "closed" | "cant" | "bad"] ?? c.bad}</p>}
    </form>
  );
}
