import { copy } from "@/lib/copy";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import { demoStudentPlan } from "@/lib/demo";
import FlagForm from "./FlagForm";

export const dynamic = "force-dynamic";

const TONE: Record<string, string> = {
  COMPLETED: "bg-mint text-ink",
  TEACHER_NO_SHOW: "bg-coral/60 text-ink",
  TEACHER_LATE_OR_SHORT: "bg-sun text-ink",
  STUDENT_NO_SHOW: "bg-mist text-ink-2",
  BOTH_ABSENT: "bg-mist text-ink-2",
};

export default async function StudentDashboard() {
  const lang = await getLang();
  const c = copy(lang).student;
  const plan = demoStudentPlan();
  const fmt = (d: Date) => L.dateTime(d, lang);
  const refunded = plan.classes.reduce((a, c) => a + c.refund, 0);
  const next = plan.classes.find((c) => !c.outcome);
  const past = plan.classes.filter((c) => c.outcome);
  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <h1 className="font-display text-4xl font-extrabold">{c.h1}</h1>

      {next && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border-2 border-ink bg-lilac p-6">
          <div className="flex-1">
            <div className="text-sm text-ink-2">{c.next}</div>
            <div className="font-display text-2xl font-extrabold">{c.with(L.subjects(plan.slot.subjects, lang), L.name(plan.teacher, lang))}</div>
            <div className="text-sm text-ink-2">{fmt(next.start)} · {c.reminder}</div>
          </div>
          <a href="/class/demo" className="btn-sun">{c.open}</a>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat k={c.paid} v={L.taka(plan.paid, lang)} />
        <Stat k={c.done} v={c.of(past.length, plan.classes.length)} />
        <Stat k={c.refunded} v={L.taka(refunded, lang)} />
      </div>

      <h2 className="mb-3 mt-8 font-display text-2xl font-extrabold">{c.history}</h2>
      <div className="divide-y divide-line card">
        {past.map((k) => {
          const label = c.outcome[k.outcome!] ?? "";
          const cls = TONE[k.outcome!] ?? "";
          return (
            <div key={k.id} className="flex items-center gap-3 p-4 text-sm">
              <div className="flex-1">{fmt(k.start)}</div>
              <span className={`tag ${cls}`}>{label}</span>
              {k.refund > 0 && <span className="font-semibold text-leaf">+{L.taka(k.refund, lang)}</span>}
            </div>
          );
        })}
      </div>

      <div id="flag" className="mt-8">
        <FlagForm classes={past.filter((k) => k.outcome === "COMPLETED").map((k) => ({ id: k.id, label: fmt(k.start) }))} />
      </div>

      <div className="mt-8 flex gap-3 text-sm">
        <button className="btn-ghost">{c.renew}</button>
        <button className="btn-ghost text-coral!">{c.stop}</button>
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-ink-2">{k}</div>
      <div className="mt-1 font-display text-2xl font-extrabold">{v}</div>
    </div>
  );
}
