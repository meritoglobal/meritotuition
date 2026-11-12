import { DATA_LIVE } from "@/lib/data";
import Link from "next/link";
import { getUser } from "@/lib/auth/session";
import { getProfile, nextClass, scriptsToCheck, teacherBatches } from "@/lib/batches";
import { toolsCopy } from "@/lib/copy-tools";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import type { ClassLevel } from "@mastermoshai/core";

export default async function TeachHome() {
  if (!DATA_LIVE) return null; // the layout shows the setup note
  const lang = await getLang();
  const t = toolsCopy(lang).teach;
  const u = (await getUser())!;
  const [profile, batches] = await Promise.all([getProfile(u.id), teacherBatches(u.id)]);
  const active = batches.filter((b) => b.active);
  const toCheck = await scriptsToCheck(batches.map((b) => b.class_id));
  const upcoming = active
    .map((b) => ({ b, at: nextClass(b.schedule) }))
    .filter((x): x is { b: typeof x.b; at: Date } => !!x.at)
    .sort((a, z) => a.at.getTime() - z.at.getTime());
  const next = upcoming[0];

  return (
    <div>
      <h1 className="font-display text-3xl">{profile ? t.hello(profile.name.split(" ")[0]!) : t.helloNew}</h1>
      {!profile && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-gold bg-gold/15 p-4 text-sm">
          <span>{t.setupProfile}</span>
          <Link href="/teach/profile" className="btn-board ml-auto text-sm">{t.setupBtn}</Link>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-board bg-board p-4 text-white sm:col-span-2">
          <div className="text-xs text-white/65">{t.next}</div>
          {next ? (
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <div>
                <div className="text-lg font-semibold">{next.b.title}</div>
                <div className="text-sm text-white/80">{L.dateTime(next.at, lang)}</div>
              </div>
              <Link href={`/class/${next.b.class_id}`} className="btn-gold ml-auto text-sm">{t.enter}</Link>
            </div>
          ) : <div className="mt-1 text-sm text-white/80">{t.noNext}</div>}
        </div>
        <Stat k={t.stats.batches} v={L.num(active.length, lang)} />
        <Stat k={t.stats.toCheck} v={L.num(toCheck, lang)} warn={toCheck > 0} />
      </div>

      <div className="mt-8 flex items-center">
        <h2 className="font-display text-2xl">{t.batches}</h2>
        <Link href="/teach/batches/new" className="btn-board ml-auto text-sm">{t.newBatch}</Link>
      </div>
      {batches.length === 0 ? (
        <p className="mt-4 rounded-lg bg-mist p-6 text-center text-sm text-ink-2">{t.noBatches}</p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {batches.map((b) => (
            <div key={b.id} className={`card p-4 ${b.active ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{b.title}</div>
                  <div className="text-xs text-ink-3">
                    {L.subject(b.subject, lang)} · {L.level(b.level as ClassLevel, lang)} · {b.mode === "OFFLINE" ? t.home : t.online} · {t.seats(b.students, b.capacity)}
                    {!b.active && <> · {t.archived}</>}
                  </div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                {b.schedule.map((s, i) => <span key={i} className="tag">{L.day(s.day as 0, lang)} {L.time(s.time, lang)}</span>)}
              </div>
              <div className="mt-3 flex gap-2">
                <Link href={`/teach/batches/${b.id}`} className="btn-ghost px-3! py-1! text-sm">{t.open}</Link>
                {b.active && <Link href={`/class/${b.class_id}`} className="btn-board px-3! py-1! text-sm">{t.enter}</Link>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <div className="text-xs text-ink-2">{k}</div>
      <div className={`mt-1 text-2xl font-bold ${warn ? "text-redpen" : ""}`}>{v}</div>
    </div>
  );
}
