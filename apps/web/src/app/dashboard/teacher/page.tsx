import { DEMO_TEACHERS, teacherReceives } from "@mastermoshai/core";
import { copy } from "@/lib/copy";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import { RoutineList } from "@/components/Routine";
import { demoTeacherEarnings } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default async function TeacherDashboard() {
  const lang = await getLang();
  const c = copy(lang).teacher;
  const tk = (x: number) => L.taka(x, lang);
  const t = DEMO_TEACHERS[0]!;
  const e = demoTeacherEarnings();
  const fmt = (d: Date) => L.date(d, lang);
  const example = teacherReceives(3000, e.paidClasses);
  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl">{c.h1}</h1>
        <span className="text-ink-2">{L.name(t, lang)}</span>
        <a href="/class/demo?as=teacher" className="ml-auto btn-board">{c.start}</a>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <Card k={c.net} v={tk(e.net)} strong />
        <Card k={c.commission(Math.round(e.rate * 100))} v={tk(e.commission)} />
        <Card k={c.hold} v={tk(e.pending)} />
        <Card k={c.available} v={tk(e.available)} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 card p-4 text-sm">
        <span>{c.summary(tk(e.gross), tk(e.paidOut), tk(e.lost))}</span>
        <button className="btn ml-auto border-[#e2136e] bg-[#e2136e] text-white">{c.withdraw}</button>
      </div>
      <p className="mt-2 text-xs text-ink-2">
        {c.note(e.paidClasses, tk(example.teacher))}
      </p>

      <h2 className="mb-3 mt-8 font-display text-2xl">{c.recent}</h2>
      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead className="bg-mist text-left text-xs text-ink-2">
            <tr>{c.cols.map((h, i) => <th key={h} className={`p-3 ${i > 2 ? "text-right" : ""}`}>{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {e.rows.map((r) => (
              <tr key={r.id}>
                <td className="p-3">{fmt(r.date)}</td>
                <td className="p-3">{L.subjects(r.subjects, lang)} {L.num(`1:${r.batchSize}`, lang)}</td>
                <td className="p-3">{r.pending ? <span className="text-ink">{c.onHold}</span> : c.outcome[r.outcome]}</td>
                <td className="p-3 text-right">{tk(r.classShare)}</td>
                <td className="p-3 text-right text-ink-2">−{tk(r.platform)}</td>
                <td className="p-3 text-right font-medium">{tk(r.teacherNet)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mb-3 mt-8 flex items-center">
        <h2 className="font-display text-2xl">{c.myRoutine}</h2>
        <button className="ml-auto btn-ghost py-1.5! text-sm!">{c.add}</button>
      </div>
      <RoutineList slots={t.routine} teacherId={t.id} actions={false} lang={lang} />
    </div>
  );
}

function Card({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${strong ? "border-board bg-board text-white" : "border-line bg-paper"}`}>
      <div className={`text-xs ${strong ? "text-white/65" : "text-ink-2"}`}>{k}</div>
      <div className="mt-1 text-2xl font-bold">{v}</div>
    </div>
  );
}
