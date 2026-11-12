"use client";
import { useActionState, useEffect, useRef } from "react";
import { toolsCopy } from "@/lib/copy-tools";
import { useLang } from "@/lib/lang-client";
import type { FormState } from "../../actions";

export default function AddStudent({ action }: { action: (s: FormState, f: FormData) => Promise<FormState> }) {
  const lang = useLang();
  const t = toolsCopy(lang).teach.batch;
  const [state, run, pending] = useActionState<FormState, FormData>(action, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) form.current?.reset(); }, [state]);
  const err = state?.error === "full" ? t.full : state?.error === "badEmail" ? t.badEmail : state?.error ? toolsCopy(lang).error : "";
  return (
    <form ref={form} action={run} className="mt-4 rounded-lg bg-mist p-3">
      <div className="text-sm font-medium">{t.addH}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        <input name="email" type="email" required placeholder={t.email} className="field min-w-0 flex-1 py-1.5! text-sm" />
        <input name="name" placeholder={t.name} className="field w-36 py-1.5! text-sm" />
        <button disabled={pending} className="btn-board px-3! py-1.5! text-sm">{t.add}</button>
      </div>
      {err && <p role="alert" className="mt-2 text-sm text-redpen">{err}</p>}
      <p className="mt-2 text-xs text-ink-3">{t.addNote}</p>
    </form>
  );
}
