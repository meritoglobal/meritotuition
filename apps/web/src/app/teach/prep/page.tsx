import Link from "next/link";
import { CLASS_LEVELS, SUBJECTS, type ClassLevel } from "@mastermoshai/core";
import { getUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/batches";
import { CONTENT } from "@/lib/content-catalog";
import { marketCopy } from "@/lib/copy-market";
import { getLang } from "@/lib/lang";
import { L } from "@/lib/l10n";

export const dynamic = "force-dynamic";

/** Class preparation: pick class and subject, then a chapter; sheets open topic by topic. */
export default async function Prep({ searchParams }: { searchParams: Promise<{ level?: string; subject?: string }> }) {
  const lang = await getLang();
  const c = marketCopy(lang).prep;
  const sp = await searchParams;
  const p = await getProfile((await getUser())!.id).catch(() => null);
  const level = CLASS_LEVELS.find((l) => l === sp.level) ?? (p?.levels[0] as ClassLevel | undefined) ?? "CLASS_9_10";
  const subject = SUBJECTS.find((s) => s === sp.subject) ?? p?.subjects[0] ?? "Physics";
  const sheets = CONTENT.filter((x) => x.kind === "sheet" && x.level === level && x.subject === subject).sort((a, b) => a.chapter - b.chapter);
  return (
    <div>
      <h1 className="font-display text-3xl">{c.h1}</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-2">{c.sub}</p>
      <form className="mt-5 flex flex-wrap items-end gap-3">
        <label className="field"><span>{c.level}</span>
          <select name="level" defaultValue={level}>{CLASS_LEVELS.map((l) => <option key={l} value={l}>{L.level(l, lang)}</option>)}</select>
        </label>
        <label className="field"><span>{c.subject}</span>
          <select name="subject" defaultValue={subject}>{SUBJECTS.map((s) => <option key={s} value={s}>{L.subject(s, lang)}</option>)}</select>
        </label>
        <button className="btn-board">{c.go}</button>
      </form>
      {sheets.length === 0 ? <p className="mt-6 rounded-lg bg-mist p-6 text-center text-sm text-ink-2">{c.none}</p> : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {sheets.map((s) => (
            <li key={s.id} className="card p-4">
              <div className="text-xs text-ink-3">{c.chapter(s.chapter)}</div>
              <Link href={`/teach/prep/${s.id}`} className="mt-0.5 block font-semibold hover:underline">{s.title[lang]}</Link>
              {s.topics && (
                <ol className="mt-3 space-y-1 text-sm">
                  {s.topics.map((t, i) => (
                    <li key={i}><Link href={`/teach/prep/${s.id}?t=${i}`} className="flex gap-2 hover:text-ink"><span className="w-16 shrink-0 text-ink-3">{t.no}</span><span>{t.title}</span></Link></li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
