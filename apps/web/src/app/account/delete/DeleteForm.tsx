"use client";
import { useActionState } from "react";
import { deleteMe, type DeleteState } from "./actions";

export default function DeleteForm({ t }: { t: { confirm: string; button: string; err: Record<string, string> } }) {
  const [state, act, busy] = useActionState<DeleteState, FormData>(deleteMe, null);
  return (
    <form action={act} className="mt-6 space-y-3">
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="confirm" className="mt-1" />
        <span>{t.confirm}</span>
      </label>
      <button disabled={busy} className="btn border-redpen bg-redpen px-4! py-2! text-white">{t.button}</button>
      {state?.error && <p className="text-sm text-redpen">{t.err[state.error]}</p>}
    </form>
  );
}
