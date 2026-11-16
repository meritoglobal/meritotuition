"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { CLASS_LEVELS, SUBJECTS } from "@mastermoshai/core";
import { marketCopy } from "@/lib/copy-market";
import { L } from "@/lib/l10n";
import { useLang } from "@/lib/lang-client";
import type { ReqState } from "./actions";

export default function NewRequest({ action, areas }: { action: (s: ReqState, f: FormData) => Promise<ReqState>; areas: string[] }) {
  const lang = useLang();
  const c = marketCopy(lang).req;
  const [state, run, pending] = useActionState<ReqState, FormData>(action, null);
  const [mode, setMode] = useState<"HOME" | "ONLINE">("HOME");
  return (
    <form action={run} className="card grid gap-3 p-5 sm:grid-cols-2">
      <h2 className="font-semibold sm:col-span-2">{c.newH}</h2>
      <label className="field"><span>{c.subject}</span>
        <select name="subject" required defaultValue="Math">{SUBJECTS.map((s) => <option key={s} value={s}>{L.subject(s, lang)}</option>)}</select>
      </label>
      <label className="field"><span>{c.level}</span>
        <select name="level" required defaultValue="CLASS_9_10">{CLASS_LEVELS.map((l) => <option key={l} value={l}>{L.level(l, lang)}</option>)}</select>
      </label>
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium text-ink-2">{c.mode}</legend>
        <div className="mt-1 flex gap-2">
          {(["HOME", "ONLINE"] as const).map((m) => (
            <label key={m} className={`tag cursor-pointer px-3! py-1.5! ${mode === m ? "bg-board! text-white!" : ""}`}>
              <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" />{m === "HOME" ? c.home : c.online}
            </label>
          ))}
        </div>
      </fieldset>
      {mode === "HOME" && (
        <label className="field"><span>{c.area}</span>
          <select name="area" required defaultValue="">{[<option key="" value="" disabled>—</option>, ...areas.map((a) => <option key={a} value={a}>{L.area(a, lang)}</option>)]}</select>
        </label>
      )}
      <label className="field"><span>{c.budget}</span><input name="budget" inputMode="numeric" placeholder="4000" required /></label>
      <label className="field"><span>{c.days}</span>
        <select name="days" defaultValue="3">{[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{L.num(d, lang)}</option>)}</select>
      </label>
      <label className="field sm:col-span-2"><span>{c.note}</span><textarea name="note" rows={2} maxLength={500} placeholder={c.notePh} /></label>
      <button disabled={pending} className="btn-gold sm:col-span-2">{pending ? c.posting : c.post}</button>
      {state?.error && <p className="text-sm text-redpen sm:col-span-2">{c.errors[state.error as keyof typeof c.errors] ?? c.errors.db}</p>}
      {state?.id && <p className="text-sm text-leaf sm:col-span-2">{c.posted(state.notified ?? 0)} <Link href={`/requests/${state.id}`} className="underline">→</Link></p>}
    </form>
  );
}
