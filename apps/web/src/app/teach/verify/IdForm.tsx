"use client";
import { useActionState } from "react";
import { bizCopy } from "@/lib/copy-biz";
import { useLang } from "@/lib/lang-client";
import type { VerifyState } from "./actions";

export default function IdForm({ action }: { action: (s: VerifyState, f: FormData) => Promise<VerifyState> }) {
  const c = bizCopy(useLang()).verify;
  const [state, run, pending] = useActionState<VerifyState, FormData>(action, null);
  const err = state?.error === "image" ? c.badImage : state?.error === "profile" ? c.needProfile : state?.error ? c.status.REJECTED : "";
  return (
    <form action={run} className="card space-y-4 p-5">
      <label className="field"><span>{c.front}</span><input name="front" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required /></label>
      <label className="field"><span>{c.back}</span><input name="back" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" /></label>
      <ul className="space-y-1 text-xs text-ink-2">{c.rules.map((r) => <li key={r}>· {r}</li>)}</ul>
      {err && <p role="alert" className="text-sm text-redpen">{err}</p>}
      {state?.status && <p role="status" className="text-sm font-semibold">{c.status[state.status]}</p>}
      <button disabled={pending} className="btn-board w-full">{pending ? c.sending : c.submit}</button>
    </form>
  );
}
