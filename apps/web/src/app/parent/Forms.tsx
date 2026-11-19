"use client";
import { useActionState } from "react";
import { growthCopy } from "@/lib/copy-growth";
import { useLang } from "@/lib/lang-client";
import { L } from "@/lib/l10n";
import type { LinkState } from "./actions";

export function LinkChild({ action }: { action: (s: LinkState, f: FormData) => Promise<LinkState> }) {
  const lang = useLang();
  const c = growthCopy(lang);
  const [state, run, pending] = useActionState<LinkState, FormData>(action, null);
  const err = state?.error === "bad" ? c.parent.bad : state?.error === "self" ? c.parent.self : state?.error ? c.error : "";
  return (
    <form action={run} className="mt-3 flex flex-wrap gap-2">
      <input name="code" inputMode="numeric" required maxLength={12} placeholder={c.parent.code} className="field w-40 py-2! text-lg tracking-widest" />
      <input name="name" placeholder={c.parent.childName} className="field min-w-0 flex-1 py-2!" />
      <button disabled={pending} className="btn-board">{c.parent.link}</button>
      {err && <p role="alert" className="w-full text-sm text-redpen">{err}</p>}
      {state?.ok && <p role="status" className="w-full text-sm text-leaf">{c.parent.linked}</p>}
    </form>
  );
}

export function MakeCode({ action }: { action: (s: LinkState) => Promise<LinkState> }) {
  const lang = useLang();
  const c = growthCopy(lang).parent;
  const [state, run, pending] = useActionState<LinkState>(action, null);
  return (
    <form action={run} className="mt-3 flex flex-wrap items-center gap-3">
      {state?.code && (
        <div>
          <div className="text-xs text-ink-3">{c.yourCode}</div>
          <div className="select-all font-mono text-3xl font-bold tracking-[0.3em]">{L.num(state.code, lang)}</div>
        </div>
      )}
      <button disabled={pending} className={state?.code ? "btn-ghost" : "btn-gold"}>{state?.code ? c.newCode : c.makeCode}</button>
    </form>
  );
}
