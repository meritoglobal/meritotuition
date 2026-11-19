"use client";
import { useActionState, useState } from "react";
import { growthCopy } from "@/lib/copy-growth";
import { useLang } from "@/lib/lang-client";
import type { BuyState } from "../actions";

export default function BuyForm({ action, amount }: { action: (s: BuyState, f: FormData) => Promise<BuyState>; amount: string }) {
  const g = growthCopy(useLang());
  const c = g.pkg;
  const [state, run, pending] = useActionState<BuyState, FormData>(action, null);
  const [who, setWho] = useState<"me" | "child">("me");
  const err = state?.error === "badCoupon" ? c.badCoupon : state?.error === "badEmail" ? c.badChild : state?.error ? g.error : "";
  return (
    <form action={run} className="mt-4 space-y-3">
      <fieldset>
        <legend className="text-sm font-medium">{c.forWhom}</legend>
        <div className="mt-1 flex gap-2">
          {(["me", "child"] as const).map((w) => (
            <label key={w} className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-semibold ${who === w ? "border-board bg-board text-white" : "border-line"}`}>
              <input type="radio" name="for" value={w} checked={who === w} onChange={() => setWho(w)} className="sr-only" />{w === "me" ? c.me : c.child}
            </label>
          ))}
        </div>
      </fieldset>
      {who === "child" && <label className="field"><span>{c.childEmail}</span><input name="child" type="email" required /></label>}
      <label className="field"><span>{c.coupon}</span><input name="coupon" maxLength={30} className="uppercase" /></label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="auto" defaultChecked className="mt-1" />{c.autoLabel}</label>
      {err && <p role="alert" className="text-sm text-redpen">{err}</p>}
      <button disabled={pending} className="btn w-full border-[#e2136e] bg-[#e2136e] text-white hover:bg-[#c70f5f]">{c.payNow(amount)}</button>
    </form>
  );
}
