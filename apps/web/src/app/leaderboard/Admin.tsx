"use client";
import { useActionState } from "react";
import { SUBJECTS } from "@mastermoshai/core";
import { growthCopy } from "@/lib/copy-growth";
import { L } from "@/lib/l10n";
import { useLang } from "@/lib/lang-client";
import type { TestState } from "./actions";

export default function Admin({ action, sample }: { action: (s: TestState, f: FormData) => Promise<TestState>; sample: () => Promise<void> }) {
  const lang = useLang();
  const g = growthCopy(lang);
  const c = g.test;
  const [state, run, pending] = useActionState<TestState, FormData>(action, null);
  return (
    <section className="card mt-10 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-semibold">{c.adminH}</h2>
        <form action={sample} className="ml-auto"><button className="btn-ghost px-3! py-1.5! text-sm">{c.sample}</button></form>
      </div>
      <form action={run} className="mt-3 grid gap-2 sm:grid-cols-4">
        <label className="field sm:col-span-2"><span>{c.tTitle}</span><input name="title" required /></label>
        <label className="field"><span>{c.tSubject}</span><select name="subject">{SUBJECTS.map((s) => <option key={s} value={s}>{L.subject(s, lang)}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="field"><span>{c.tDuration}</span><input name="duration" inputMode="numeric" defaultValue="20" /></label>
          <label className="field"><span>{c.tPrice}</span><input name="price" inputMode="numeric" defaultValue="0" /></label>
        </div>
        <label className="sm:col-span-4">
          <span className="text-xs text-ink-3">{c.tQuestions} · {c.adminFmt}</span>
          <textarea name="questions" required rows={8} className="mt-1 w-full rounded-lg border border-line p-3 font-mono text-sm" />
        </label>
        {state?.bad && <p className="text-sm text-redpen sm:col-span-4">{c.badLines(state.bad)}</p>}
        {state?.error && !state.bad && <p className="text-sm text-redpen sm:col-span-4">{g.error}</p>}
        <button disabled={pending} className="btn-board sm:col-span-4">{c.tCreate}</button>
      </form>
    </section>
  );
}
