"use client";
import { useActionState, useState } from "react";
import { bizCopy } from "@/lib/copy-biz";
import { useLang } from "@/lib/lang-client";
import type { WalletState } from "./actions";

type Act = (s: WalletState, f: FormData) => Promise<WalletState>;

export function NumberForm({ action, number, auto }: { action: Act; number: string | null; auto: boolean }) {
  const c = bizCopy(useLang()).wallet;
  const [state, run, pending] = useActionState<WalletState, FormData>(action, null);
  return (
    <form action={run} className="card space-y-3 p-5">
      <h2 className="font-semibold">{c.numberH}</h2>
      <div className="flex gap-2">
        <input name="number" inputMode="tel" defaultValue={number ?? ""} placeholder={c.numberPh} required className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2" />
        <button disabled={pending} className="btn-ghost px-4! py-2!">{c.save}</button>
      </div>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="auto" defaultChecked={auto} className="mt-1" />{c.autoLabel}</label>
      {state?.ok === "saved" && <p className="text-sm text-leaf">{c.saved}</p>}
      {state?.error && <p role="alert" className="text-sm text-redpen">{c.badNumber}</p>}
    </form>
  );
}

export function WithdrawForm({ action, balance, min, hasNumber }: { action: Act; balance: number; min: number; hasNumber: boolean }) {
  const c = bizCopy(useLang()).wallet;
  const [state, run, pending] = useActionState<WalletState, FormData>(action, null);
  const [amount, setAmount] = useState("");
  const err = state?.error === "number" ? c.needNumber : state?.error === "min" ? c.min(min) : state?.error === "balance" ? c.tooMuch : state?.error ? c.failedSend : "";
  const ok = state?.ok === "PAID" ? c.sentOk : state?.ok === "QUEUED" ? c.queued : state?.ok === "FAILED" ? c.failedSend : "";
  return (
    <form action={run} className="card space-y-3 p-5">
      <h2 className="font-semibold">{c.withdrawH}</h2>
      <div className="flex gap-2">
        <input name="amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={c.amount} required disabled={!hasNumber} className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2" />
        <button type="button" onClick={() => setAmount(String(balance))} disabled={!hasNumber} className="btn-ghost px-3! py-2! text-sm">{c.all}</button>
      </div>
      <button disabled={pending || !hasNumber || balance < min} className="btn w-full border-[#e2136e] bg-[#e2136e] text-white hover:bg-[#c70f5f]">{c.send}</button>
      {!hasNumber && <p className="text-sm text-ink-2">{c.needNumber}</p>}
      {err && <p role="alert" className="text-sm text-redpen">{err}</p>}
      {ok && <p role="status" className="text-sm text-leaf">{ok}</p>}
    </form>
  );
}
