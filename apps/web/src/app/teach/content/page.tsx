import { DATA_LIVE } from "@/lib/data";
import type { ClassLevel } from "@mastermoshai/core";
import { getUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/batches";
import { CONTENT } from "@/lib/content-catalog";
import { toolsCopy } from "@/lib/copy-tools";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  if (!DATA_LIVE) return null; // the layout shows the setup note
  const lang = await getLang();
  const t = toolsCopy(lang).teach;
  const { all } = await searchParams;
  const p = await getProfile((await getUser())!.id);
  const mine = !all && p && p.subjects.length > 0;
  const items = mine ? CONTENT.filter((c) => p.subjects.includes(c.subject) && (p.levels.length === 0 || p.levels.includes(c.level))) : CONTENT;
  return (
    <div>
      <h1 className="font-display text-3xl">{t.content.h}</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-2">{t.content.sub}</p>
      {p && p.subjects.length > 0 && (
        <div className="mt-4 flex gap-2 text-sm">
          <a href="/teach/content" className={`tag ${mine ? "bg-board! text-white!" : ""}`}>{t.content.mine}</a>
          <a href="/teach/content?all=1" className={`tag ${!mine ? "bg-board! text-white!" : ""}`}>{t.content.all}</a>
        </div>
      )}
      {items.length === 0 ? <p className="mt-6 rounded-lg bg-mist p-6 text-center text-sm text-ink-2">{t.batch.noContent}</p> : (
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {items.map((c) => (
            <li key={c.id} className="card p-4">
              <div className="text-xs text-ink-3">{L.subject(c.subject, lang)} · {L.level(c.level as ClassLevel, lang)} · {t.content.kinds[c.kind]}</div>
              <div className="mt-1 font-medium">{c.title[lang]}</div>
              <a href={c.href} target="_blank" rel="noreferrer" className="btn-ghost mt-3 inline-block px-3! py-1! text-sm">{t.batch.download}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
