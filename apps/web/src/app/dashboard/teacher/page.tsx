import { DEMO_TEACHERS, formatTaka, teacherReceives } from "@porao/core";
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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Teacher dashboard</h1>
        <span className="text-slate-500">{t.name}</span>
        <a href="/class/demo?as=teacher" className="ml-auto rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white">Start next class</a>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <Card k="Earned (after commission)" v={formatTaka(e.net)} strong />
        <Card k={`Porao commission (${Math.round(e.rate * 100)}%)`} v={formatTaka(e.commission)} />
        <Card k="On hold (48 h flag window)" v={formatTaka(e.pending)} />
        <Card k="Available to withdraw" v={formatTaka(e.available)} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <span>Gross {formatTaka(e.gross)} · Paid out {formatTaka(e.paidOut)} · Lost to flags/late {formatTaka(e.lost)}</span>
        <button className="ml-auto rounded-full bg-pink-600 px-4 py-1.5 font-semibold text-white">Withdraw to bKash</button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {e.paidClasses} paid classes taught. Commission drops to 20% after 50 classes and 15% after 200. Example: a ৳3,000 plan → you receive {formatTaka(example.teacher)}.
      </p>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Recent classes</h2>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr><th className="p-3">Date</th><th className="p-3">Batch</th><th className="p-3">Result</th><th className="p-3 text-right">Class price</th><th className="p-3 text-right">Commission</th><th className="p-3 text-right">You get</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {e.rows.map((r) => (
              <tr key={r.id}>
                <td className="p-3">{fmt(r.date)}</td>
                <td className="p-3">{r.batch}</td>
                <td className="p-3">{r.pending ? <span className="text-amber-700">On hold</span> : OUTCOME[r.outcome]}</td>
                <td className="p-3 text-right">{formatTaka(r.classShare)}</td>
                <td className="p-3 text-right text-slate-500">−{formatTaka(r.platform)}</td>
                <td className="p-3 text-right font-medium">{formatTaka(r.teacherNet)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mb-3 mt-8 flex items-center">
        <h2 className="text-lg font-semibold">My weekly routine</h2>
        <button className="ml-auto rounded-full border border-slate-300 px-4 py-1.5 text-sm">+ Add slot</button>
      </div>
      <RoutineList slots={t.routine} teacherId={t.id} actions={false} />
    </div>
  );
}

function Card({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${strong ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white"}`}>
      <div className="text-xs text-slate-500">{k}</div>
      <div className="mt-1 text-xl font-bold">{v}</div>
    </div>
  );
}
