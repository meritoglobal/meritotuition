"use client";
import { useActionState, useState } from "react";
import { growthCopy } from "@/lib/copy-growth";
import { useLang } from "@/lib/lang-client";
import type { RefState } from "./actions";

export function CopyLink({ link }: { link: string }) {
  const c = growthCopy(useLang()).refer;
  const [done, setDone] = useState(false);
  return (
    <div className="mt-1 flex gap-2">
      <input readOnly value={link} className="min-w-0 flex-1 rounded-lg border border-line bg-mist px-3 py-2 text-sm" onFocus={(e) => e.currentTarget.select()} />
      <button type="button" className="btn-ghost px-3! py-2!" onClick={() => navigator.clipboard?.writeText(link).then(() => setDone(true))}>{done ? c.copied : c.copy}</button>
    </div>
  );
}

export function ApplyCode({ action }: { action: (s: RefState, f: FormData) => Promise<RefState> }) {
  const c = growthCopy(useLang()).refer;
  const [state, run, pending] = useActionState<RefState, FormData>(action, null);
  return (
    <form action={run} className="mt-2 flex flex-wrap gap-2">
      <input name="code" required maxLength={12} className="field w-36 py-2! uppercase" />
      <button disabled={pending} className="btn-ghost">{c.enter}</button>
      {state?.ok && <p className="w-full text-sm text-leaf">{c.applied}</p>}
      {state?.error && <p className="w-full text-sm text-redpen">{c.badCode}</p>}
    </form>
  );
}

export function NewCoupon({ action }: { action: (s: RefState, f: FormData) => Promise<RefState> }) {
  const g = growthCopy(useLang());
  const c = g.refer;
  const [state, run, pending] = useActionState<RefState, FormData>(action, null);
  return (
    <form action={run} className="mt-3 grid gap-2 sm:grid-cols-6">
      <label className="field sm:col-span-2"><span>{c.cCode}</span><input name="code" required className="uppercase" /></label>
      <label className="field"><span>{c.cPercent}</span><input name="percent" inputMode="numeric" /></label>
      <label className="field"><span>{c.cAmount}</span><input name="amount" inputMode="numeric" /></label>
      <label className="field"><span>{c.cMax}</span><input name="max" inputMode="numeric" /></label>
      <label className="field"><span>{c.cExpires}</span><input name="expires" type="date" /></label>
      <button disabled={pending} className="btn-board sm:col-span-6">{c.cCreate}</button>
      {state?.error && <p className="text-sm text-redpen sm:col-span-6">{g.error}</p>}
    </form>
  );
}
