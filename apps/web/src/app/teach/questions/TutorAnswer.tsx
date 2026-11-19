"use client";
import { useActionState } from "react";
import { growthCopy } from "@/lib/copy-growth";
import { useLang } from "@/lib/lang-client";
import type { AnsState } from "./actions";

export default function TutorAnswer({ action }: { action: (s: AnsState, f: FormData) => Promise<AnsState> }) {
  const g = growthCopy(useLang());
  const [state, run, pending] = useActionState<AnsState, FormData>(action, null);
  return (
    <form action={run} className="card mt-4 space-y-3 border-board p-5">
      <label className="block">
        <span className="text-sm font-semibold">{g.ask.write}</span>
        <textarea name="answer" required rows={10} maxLength={8000} className="mt-1 w-full rounded-lg border border-line p-3 text-[15px]" />
      </label>
      {state?.error && <p className="text-sm text-redpen">{g.error}</p>}
      <button disabled={pending} className="btn-board w-full">{g.ask.submit}</button>
    </form>
  );
}
