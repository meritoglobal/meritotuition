import { formatTaka } from "@porao/core";
import { demoStudentPlan } from "@/lib/demo";
import FlagForm from "./FlagForm";

export const dynamic = "force-dynamic";

const LABEL: Record<string, [string, string]> = {
  COMPLETED: ["Done", "bg-brand-50 text-brand-700"],
  TEACHER_NO_SHOW: ["Teacher absent · refunded", "bg-red-50 text-red-700"],
  TEACHER_LATE_OR_SHORT: ["Late/short · half refunded", "bg-amber-50 text-amber-700"],
  STUDENT_NO_SHOW: ["You missed it", "bg-slate-100 text-slate-600"],
  BOTH_ABSENT: ["Not held · refunded", "bg-slate-100 text-slate-600"],
};

export default function StudentDashboard() {
  const plan = demoStudentPlan();
  const fmt = (d: Date) => d.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const refunded = plan.classes.reduce((a, c) => a + c.refund, 0);
  const next = plan.classes.find((c) => !c.outcome);
  const past = plan.classes.filter((c) => c.outcome);
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">My classes</h1>

      {next && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-brand-900 p-5 text-white">
          <div className="flex-1">
            <div className="text-sm text-brand-100">Next class</div>
            <div className="text-lg font-semibold">{plan.slot.subjects.join(", ")} with {plan.teacher.name}</div>
            <div className="text-sm text-brand-100">{fmt(next.start)} · reminder 10 min before</div>
          </div>
          <a href="/class/demo" className="rounded-full bg-white px-5 py-2.5 font-semibold text-brand-900">Open class room</a>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat k="Paid for this month" v={formatTaka(plan.paid)} />
        <Stat k="Classes done" v={`${past.length} of ${plan.classes.length}`} />
        <Stat k="Refunded to your credit" v={formatTaka(refunded)} />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Class history</h2>
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {past.map((c) => {
          const [label, cls] = LABEL[c.outcome!] ?? ["", ""];
          return (
            <div key={c.id} className="flex items-center gap-3 p-4 text-sm">
              <div className="flex-1">{fmt(c.start)}</div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>{label}</span>
              {c.refund > 0 && <span className="text-brand-700">+{formatTaka(c.refund)}</span>}
            </div>
          );
        })}
      </div>

      <div id="flag" className="mt-8">
        <FlagForm classes={past.filter((c) => c.outcome === "COMPLETED").map((c) => ({ id: c.id, label: fmt(c.start) }))} />
      </div>

      <div className="mt-8 flex gap-3 text-sm">
        <button className="rounded-full border border-slate-300 px-4 py-2">Renew next month</button>
        <button className="rounded-full border border-red-200 px-4 py-2 text-red-700">Stop this tutor (untaught classes refunded)</button>
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{k}</div>
      <div className="mt-1 text-xl font-bold">{v}</div>
    </div>
  );
}
