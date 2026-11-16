"use client";
import { useActionState, useEffect, useRef } from "react";
import { CLASS_LEVELS, SUBJECTS, type ClassLevel } from "@mastermoshai/core";
import { growthCopy } from "@/lib/copy-growth";
import { L } from "@/lib/l10n";
import { useLang } from "@/lib/lang-client";
import type { PkgState } from "./actions";

export default function NewPackage({ action, batches }: { action: (s: PkgState, f: FormData) => Promise<PkgState>; batches: { id: string; title: string }[] }) {
  const lang = useLang();
  const g = growthCopy(lang);
  const c = g.pkg;
  const [state, run, pending] = useActionState<PkgState, FormData>(action, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) form.current?.reset(); }, [state]);
  const err = state?.error === "bad" ? c.bad : state?.error === "profile" ? c.needProfile : state?.error ? g.error : "";
  return (
    <form ref={form} action={run} className="card grid gap-3 p-5 sm:grid-cols-2">
      <h2 className="font-semibold sm:col-span-2">{c.newH}</h2>
      <label className="field sm:col-span-2"><span>{c.title}</span><input name="title" required maxLength={120} placeholder={c.titlePh} /></label>
      <label className="field"><span>{c.subject}</span><select name="subject" required>{SUBJECTS.map((s) => <option key={s} value={s}>{L.subject(s, lang)}</option>)}</select></label>
      <label className="field"><span>{c.level}</span><select name="level" defaultValue="CLASS_9_10">{CLASS_LEVELS.map((l) => <option key={l} value={l}>{L.level(l as ClassLevel, lang)}</option>)}</select></label>
      <label className="field"><span>{c.daysW}</span><input name="days" inputMode="numeric" defaultValue="3" required /></label>
      <label className="field"><span>{c.classesM}</span><input name="classes" inputMode="numeric" defaultValue="12" required /></label>
      <label className="field"><span>{c.price}</span><input name="price" inputMode="numeric" placeholder="3000" required /></label>
      <label className="field"><span>{c.batch}</span><select name="batch" defaultValue=""><option value="">{c.noBatchOpt}</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}</select></label>
      {err && <p role="alert" className="text-sm text-redpen sm:col-span-2">{err}</p>}
      <button disabled={pending} className="btn-board sm:col-span-2">{c.create}</button>
    </form>
  );
}
