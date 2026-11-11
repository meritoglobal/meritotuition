import { formatTaka } from "@merito/core";
import { demoStudentPlan } from "@/lib/demo";
import FlagForm from "./FlagForm";

export const dynamic = "force-dynamic";

const LABEL: Record<string, [string, string]> = {
  COMPLETED: ["Done", "bg-mint text-leaf"],
  TEACHER_NO_SHOW: ["Teacher absent · refunded", "bg-coral/60 text-ink"],
  TEACHER_LATE_OR_SHORT: ["Late/short · half refunded", "bg-sun text-ink"],
  STUDENT_NO_SHOW: ["You missed it", "bg-mist text-ink-2"],
  BOTH_ABSENT: ["Not held · refunded", "bg-mist text-ink-2"],
};

export default function StudentDashboard() {
  const plan = demoStudentPlan();
  const fmt = (d: Date) => d.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const refunded = plan.classes.reduce((a, c) => a + c.refund, 0);
  const next = plan.classes.find((c) => !c.outcome);
  const past = plan.classes.filter((c) => c.outcome);
  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <h1 className="font-display text-4xl font-extrabold">My classes</h1>

      {next && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border-2 border-ink bg-lilac p-6">
          <div className="flex-1">
            <div className="text-sm text-ink-2">Next class</div>
            <div className="font-display text-2xl font-extrabold">{plan.slot.subjects.join(", ")} with {plan.teacher.name}</div>
            <div className="text-sm text-ink-2">{fmt(next.start)} · reminder 10 min before</div>
          </div>
          <a href="/class/demo" className="btn-sun">Open class room</a>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat k="Paid for this month" v={formatTaka(plan.paid)} />
        <Stat k="Classes done" v={`${past.length} of ${plan.classes.length}`} />
        <Stat k="Refunded to your credit" v={formatTaka(refunded)} />
      </div>

      <h2 className="mb-3 mt-8 font-display text-2xl font-extrabold">Class history</h2>
      <div className="divide-y divide-line card">
        {past.map((c) => {
          const [label, cls] = LABEL[c.outcome!] ?? ["", ""];
          return (
            <div key={c.id} className="flex items-center gap-3 p-4 text-sm">
              <div className="flex-1">{fmt(c.start)}</div>
              <span className={`tag ${cls}`}>{label}</span>
              {c.refund > 0 && <span className="text-leaf">+{formatTaka(c.refund)}</span>}
            </div>
          );
        })}
      </div>

      <div id="flag" className="mt-8">
        <FlagForm classes={past.filter((c) => c.outcome === "COMPLETED").map((c) => ({ id: c.id, label: fmt(c.start) }))} />
      </div>

      <div className="mt-8 flex gap-3 text-sm">
        <button className="btn-ghost">Renew next month</button>
        <button className="btn-ghost text-coral!">Stop this tutor (untaught classes refunded)</button>
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
