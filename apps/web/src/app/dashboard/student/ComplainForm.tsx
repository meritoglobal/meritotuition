"use client";
import { useActionState } from "react";
import { COMPLAINT_REASONS } from "@mastermoshai/core";
import { bizCopy } from "@/lib/copy-biz";
import { L } from "@/lib/l10n";
import { useLang } from "@/lib/lang-client";
import type { RecentClass } from "@/lib/biz/complaints";
import { complainAction, type ComplainState } from "./complain-actions";

/** Live mode: complain about one of the last 48 hours' classes. A late tutor (15+ min) means half back at once. */
export default function ComplainForm({ classes }: { classes: RecentClass[] }) {
  const lang = useLang();
  const c = bizCopy(lang).complaint;
  return (
    <section className="card p-5">
      <h2 className="font-display text-2xl">{c.h2}</h2>
      <p className="mt-1 text-sm text-ink-2">{c.sub}</p>
      {classes.length === 0 ? <p className="mt-4 text-sm text-ink-3">{c.none}</p> : (
        <ul className="mt-4 divide-y divide-line">
          {classes.map((k) => <Row key={k.sessionId} k={k} />)}
        </ul>
      )}
    </section>
  );
}

function Row({ k }: { k: RecentClass }) {
  const lang = useLang();
  const c = bizCopy(lang).complaint;
  const [state, act, busy] = useActionState<ComplainState, FormData>(complainAction.bind(null, k.sessionId), null);
  const late = k.lateMin !== null && k.lateMin > 0;
  const done = state?.ok ?? k.complaint?.status;
  const refund = state?.refund ?? k.complaint?.refund ?? 0;
  return (
    <li className="py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <b>{k.batchTitle}</b>
        <span className="text-ink-3">{L.dateTime(new Date(k.startedAt), lang)}</span>
        <span className={`tag ${late ? "bg-gold-tint text-ink" : "bg-home text-home-ink"}`}>{late ? c.late(k.lateMin!) : c.onTime}</span>
      </div>
      {done === "REFUNDED" ? <p className="mt-2 font-semibold text-leaf">{c.refunded(L.taka(refund, lang))}</p>
        : done === "REVIEW" ? <p className="mt-2 text-ink-2">{c.review}</p>
        : done === "REJECTED" ? <p className="mt-2 text-ink-2">{c.rejected}</p>
        : (
          <form action={act} className="mt-2 flex flex-wrap gap-2">
            <select name="reason" defaultValue={late ? "TEACHER_LATE" : ""} required className="rounded-lg border border-line px-2 py-1.5">
              <option value="" disabled>…</option>
              {COMPLAINT_REASONS.map((r) => <option key={r} value={r}>{c.reasons[r]}</option>)}
            </select>
            <input name="details" placeholder={c.placeholder} maxLength={1000} className="min-w-0 flex-1 rounded-lg border border-line px-2 py-1.5" />
            <button disabled={busy} className="btn-ink px-3! py-1.5!">{c.submit}</button>
            {state?.error && <p className="w-full text-redpen">{c.err[state.error] ?? c.err.db}</p>}
          </form>
        )}
    </li>
  );
}
