import { notFound } from "next/navigation";
import { PAYOUT_LIVE } from "@/lib/biz/payout";
import { bizCopy } from "@/lib/copy-biz";
import { DATA_LIVE, db } from "@/lib/data";
import { mustMe } from "@/lib/growth/page";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import { openComplaints } from "@/lib/biz/complaints";
import { decideComplaint, forceRelease, setExpert, settle } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPayouts() {
  const m = await mustMe("/admin/payouts");
  if (!m.admin || !DATA_LIVE) notFound();
  const lang = await getLang();
  const c = bizCopy(lang).admin;
  const s = db();
  const [{ data: queue }, { data: empty }, { data: experts }] = await Promise.all([
    s.from("withdrawals").select("*").in("status", ["QUEUED", "SENDING"]).order("created_at").limit(100),
    s.from("class_sessions").select("id,class_id,day,teacher_id,started_at").eq("status", "EMPTY").order("started_at", { ascending: false }).limit(50),
    s.from("teacher_profiles").select("name,email").eq("expert", true).limit(100),
  ]);
  const complaints = await openComplaints();
  const reasons = bizCopy(lang).complaint.reasons;
  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="font-display text-3xl">{c.h1}</h1>
      <p className="mt-2 text-sm text-ink-2">{PAYOUT_LIVE ? c.live : c.off}</p>
      {(queue ?? []).length === 0 ? <p className="mt-4 text-sm text-ink-3">{c.none}</p> : (
        <ul className="mt-4 divide-y divide-line">
          {(queue ?? []).map((w) => (
            <li key={w.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <span><b>{L.taka(w.amount, lang)}</b> → <code className="select-all">{w.msisdn}</code> · {w.teacher_email} · {L.dateTime(new Date(w.created_at), lang)}</span>
              <form action={settle.bind(null, w.id, true)} className="ml-auto flex gap-2">
                <input name="trx" placeholder={c.trx} className="w-32 rounded border border-line px-2 py-1" />
                <button className="btn-board px-3! py-1!">{c.paid}</button>
              </form>
              <form action={settle.bind(null, w.id, false)}><button className="text-redpen underline">{c.failed}</button></form>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 font-semibold">{c.complaints}</h2>
      {complaints.length === 0 ? <p className="mt-2 text-sm text-ink-3">{c.noComplaints}</p> : (
        <ul className="mt-2 divide-y divide-line text-sm">
          {complaints.map((k) => (
            <li key={k.id} className="py-3">
              <div><b>{reasons[k.reason] ?? k.reason}</b> · {k.student_email} · {c.lateMin(k.late_min)} · {L.dateTime(new Date(k.created_at), lang)}</div>
              {k.details && <p className="mt-1 text-ink-2">{k.details}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                <form action={decideComplaint.bind(null, k.id, true)}><button className="btn-board px-3! py-1!">{c.halfBack}</button></form>
                <form action={decideComplaint.bind(null, k.id, false)} className="flex gap-2">
                  <input name="note" placeholder="note" className="w-40 rounded border border-line px-2 py-1" />
                  <button className="text-redpen underline">{c.reject}</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 font-semibold">{c.empty}</h2>
      <ul className="mt-2 divide-y divide-line text-sm">
        {(empty ?? []).map((x) => (
          <li key={x.id} className="flex items-center gap-3 py-2">
            <span>{x.class_id} · {x.day} · {x.teacher_id.slice(0, 8)}</span>
            <form action={forceRelease.bind(null, x.id)} className="ml-auto"><button className="underline">{c.release}</button></form>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 font-semibold">{c.expert}</h2>
      <form action={setExpert} className="mt-2 flex flex-wrap gap-2 text-sm">
        <input name="email" type="email" required placeholder={c.tutorEmail} className="rounded border border-line px-2 py-1" />
        <button name="on" value="1" className="btn-board px-3! py-1!">{c.expertOn}</button>
        <button name="on" value="0" className="btn-ghost px-3! py-1!">{c.expertOff}</button>
      </form>
      <p className="mt-2 text-sm text-ink-2">{(experts ?? []).map((e) => `${e.name} (${e.email})`).join(", ")}</p>
    </div>
  );
}
