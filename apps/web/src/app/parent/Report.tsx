import Link from "next/link";
import type { Lang } from "@mastermoshai/core";
import { growthCopy } from "@/lib/copy-growth";
import { L } from "@/lib/l10n";
import type { WeeklyReport } from "@/lib/growth/parent";

/** One child's week, for parents (and students looking at their own). */
export function Report({ r, lang, chat = true }: { r: WeeklyReport; lang: Lang; chat?: boolean }) {
  const c = growthCopy(lang).parent;
  const tutors = [...new Map(r.batches.filter((b) => b.teacherEmail).map((b) => [b.teacherEmail!, b.teacher ?? b.teacherEmail!])).entries()];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="card p-5">
        <h3 className="font-semibold">{c.classes}</h3>
        <div className="mt-1 text-3xl font-bold">{L.num(r.attendedTotal, lang)}<span className="text-lg text-ink-3">/{L.num(r.plannedTotal, lang)}</span></div>
        {r.batches.length === 0 ? <p className="mt-2 text-sm text-ink-3">{c.noBatch}</p> : (
          <ul className="mt-3 space-y-2 text-sm">
            {r.batches.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate"><b>{b.title}</b>{b.teacher ? <span className="text-ink-3"> · {b.teacher}</span> : null}</span>
                <span className={`tag ${b.attended >= b.planned ? "bg-home text-home-ink" : b.attended === 0 ? "bg-redpen-tint text-redpen" : "bg-gold-tint"}`}>{c.attended(b.attended, b.planned)}</span>
              </li>
            ))}
          </ul>
        )}
        {chat && tutors.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {tutors.map(([email, name]) => <Link key={email} href={`/chat/new?to=${encodeURIComponent(email)}`} className="btn-ghost px-3! py-1.5! text-sm">{c.message}: {name}</Link>)}
          </div>
        )}
      </section>
      <section className="card p-5">
        <h3 className="font-semibold">{c.notes}</h3>
        {r.notes.length === 0 ? <p className="mt-2 text-sm text-ink-3">{c.noNotes}</p> : (
          <ul className="mt-2 space-y-3 text-sm">
            {r.notes.map((x, i) => (
              <li key={i}>
                <div className="text-xs text-ink-3">{x.teacher ?? ""} · {x.batch}{x.rating ? ` · ${"★".repeat(x.rating)}${"☆".repeat(5 - x.rating)}` : ""}</div>
                <p className="mt-0.5">{x.note}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card p-5">
        <h3 className="font-semibold">{c.exams}</h3>
        {r.exams.length === 0 ? <p className="mt-2 text-sm text-ink-3">{c.noExams}</p> : (
          <ul className="mt-2 divide-y divide-line text-sm">
            {r.exams.map((e, i) => (
              <li key={i} className="flex justify-between gap-2 py-1.5"><span>{e.title}</span><b>{e.checked ? `${L.num(e.total, lang)}/${L.num(e.max, lang)}` : c.unchecked}</b></li>
            ))}
          </ul>
        )}
      </section>
      <section className="card p-5">
        <h3 className="font-semibold">{c.tests}</h3>
        {r.tests.length === 0 ? <p className="mt-2 text-sm text-ink-3">{c.noTests}</p> : (
          <ul className="mt-2 divide-y divide-line text-sm">
            {r.tests.map((t, i) => (
              <li key={i} className="flex justify-between gap-2 py-1.5"><span>{t.title}</span><b>{L.num(t.score, lang)}/{L.num(t.max, lang)}{t.rank ? ` · ${c.rank(t.rank)}` : ""}</b></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
