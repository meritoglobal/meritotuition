import { DEMO_TEACHERS, formatTaka, teacherReceives } from "@merito/core";
import { RoutineList } from "@/components/Routine";
import { demoTeacherEarnings } from "@/lib/demo";

export const dynamic = "force-dynamic";

const OUTCOME: Record<string, string> = {
  COMPLETED: "Completed",
  TEACHER_LATE_OR_SHORT: "Late/short (50%)",
  STUDENT_NO_SHOW: "Student absent (paid)",
  TEACHER_NO_SHOW: "You were absent (0%)",
  BOTH_ABSENT: "Not held",
};

export default function TeacherDashboard() {
  const t = DEMO_TEACHERS[0]!;
  const e = demoTeacherEarnings();
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short" });
  const example = teacherReceives(3000, e.paidClasses);
  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl font-extrabold">Teacher dashboard</h1>
        <span className="text-ink-2">{t.name}</span>
        <a href="/class/demo?as=teacher" className="ml-auto btn-ink">Start next class</a>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <Card k="Earned (after commission)" v={formatTaka(e.net)} strong />
        <Card k={`Merito commission (${Math.round(e.rate * 100)}%)`} v={formatTaka(e.commission)} />
        <Card k="On hold (48 h flag window)" v={formatTaka(e.pending)} />
        <Card k="Available to withdraw" v={formatTaka(e.available)} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 card p-4 text-sm">
        <span>Gross {formatTaka(e.gross)} · Paid out {formatTaka(e.paidOut)} · Lost to flags/late {formatTaka(e.lost)}</span>
        <button className="btn ml-auto border-ink bg-[#e2136e] text-white">Withdraw to bKash</button>
      </div>
      <p className="mt-2 text-xs text-ink-2">
        {e.paidClasses} paid classes taught. Commission drops to 20% after 50 classes and 15% after 200. Example: a ৳3,000 plan → you receive {formatTaka(example.teacher)}.
      </p>

      <h2 className="mb-3 mt-8 font-display text-2xl font-extrabold">Recent classes</h2>
      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead className="bg-mist text-left text-xs text-ink-2">
            <tr><th className="p-3">Date</th><th className="p-3">Batch</th><th className="p-3">Result</th><th className="p-3 text-right">Class price</th><th className="p-3 text-right">Commission</th><th className="p-3 text-right">You get</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {e.rows.map((r) => (
              <tr key={r.id}>
                <td className="p-3">{fmt(r.date)}</td>
                <td className="p-3">{r.batch}</td>
                <td className="p-3">{r.pending ? <span className="text-ink">On hold</span> : OUTCOME[r.outcome]}</td>
                <td className="p-3 text-right">{formatTaka(r.classShare)}</td>
                <td className="p-3 text-right text-ink-2">−{formatTaka(r.platform)}</td>
                <td className="p-3 text-right font-medium">{formatTaka(r.teacherNet)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mb-3 mt-8 flex items-center">
        <h2 className="font-display text-2xl font-extrabold">My weekly routine</h2>
        <button className="ml-auto btn-ghost py-1.5! text-sm!">+ Add slot</button>
      </div>
      <RoutineList slots={t.routine} teacherId={t.id} actions={false} />
    </div>
  );
}

function Card({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`rounded-xl border-2 p-4 ${strong ? "border-ink! bg-sun" : "border-line bg-paper"}`}>
      <div className="text-xs text-ink-2">{k}</div>
      <div className="mt-1 font-display text-2xl font-extrabold">{v}</div>
    </div>
  );
}
