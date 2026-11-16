import { CLASS_LEVELS, SUBJECTS, type ClassLevel } from "@mastermoshai/core";
import Link from "next/link";
import { Flash, Off } from "@/components/growth/Off";
import { growthCopy } from "@/lib/copy-growth";
import { DATA_LIVE } from "@/lib/data";
import { getLang } from "@/lib/lang";
import { L } from "@/lib/l10n";
import { browse, mySubscriptions } from "@/lib/growth/packages";
import { claimReferral, mustMe } from "@/lib/growth/page";
import { autoRenew, renewSub, stopSub } from "./actions";
import { PackageCard } from "./PackageCard";

export const dynamic = "force-dynamic";

export default async function Packages({ searchParams }: { searchParams: Promise<{ paid?: string; why?: string; subject?: string; level?: string; teacher?: string; renew?: string }> }) {
  const m = await mustMe("/packages");
  const lang = await getLang();
  const g = growthCopy(lang);
  const c = g.pkg;
  if (!DATA_LIVE) return <div className="mx-auto max-w-6xl px-5 py-10"><h1 className="font-display text-4xl">{c.h1}</h1><Off text={g.off} /></div>;
  await claimReferral(m.email);
  const sp = await searchParams;
  const subject = SUBJECTS.find((s) => s === sp.subject);
  const level = CLASS_LEVELS.find((l) => l === sp.level);
  const [mine, list] = await Promise.all([mySubscriptions(m.email), browse({ subject, level, teacher: sp.teacher })]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-display text-4xl">{c.h1}</h1>
      <p className="mt-2 max-w-2xl text-ink-2">{c.sub}</p>
      {sp.paid === "1" && <Flash tone="ok" text={c.paid} />}
      {sp.paid === "0" && <Flash tone="bad" text={sp.why === "cancel" ? c.cancelled : c.failed} />}

      <h2 className="mt-8 font-display text-2xl">{c.mine}</h2>
      {mine.length === 0 ? <p className="mt-2 text-sm text-ink-3">{c.none}</p> : (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {mine.map((s) => (
            <div key={s.id} className={`card p-5 ${sp.renew === s.id ? "ring-2 ring-gold" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-lg">{s.packages.title}</b>
                <span className={`tag ${s.status === "ACTIVE" ? "bg-home text-home-ink" : s.status === "PAST_DUE" ? "bg-redpen-tint text-redpen" : "bg-mist"}`}>{c.status[s.status]}</span>
              </div>
              <div className="mt-1 text-sm text-ink-2">
                {s.packages.teacher_name ? `${c.with(s.packages.teacher_name)} · ` : ""}{L.taka(s.packages.price, lang)}{c.perMonth}
                {s.student_email !== m.email ? ` · ${s.student_email}` : ""}
              </div>
              {s.current_period_end && s.status !== "CANCELLED" && <div className="text-sm text-ink-3">{c.until(L.date(new Date(s.current_period_end), lang))}</div>}
              {s.payer_msisdn && <div className="text-xs text-ink-3">{c.wallet(s.payer_msisdn)}</div>}
              {s.status !== "CANCELLED" && s.payer_email === m.email && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <form action={renewSub.bind(null, s.id)}><button className={sp.renew === s.id || s.status === "PAST_DUE" ? "btn-gold px-3! py-1.5!" : "btn-ghost px-3! py-1.5!"}>{c.renew}</button></form>
                  <form action={autoRenew.bind(null, s.id, !s.auto_renew)}>
                    <span className="text-ink-2">{c.auto}: {s.auto_renew ? c.autoOn : c.autoOff} · </span>
                    <button className="underline">{s.auto_renew ? c.turnOff : c.turnOn}</button>
                  </form>
                  <form action={stopSub.bind(null, s.id)} className="ml-auto"><button className="text-redpen">{c.cancel}</button></form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 flex flex-wrap items-end gap-3">
        <h2 className="font-display text-2xl">{c.browse}</h2>
        <form className="ml-auto flex flex-wrap gap-2 text-sm">
          <select name="subject" defaultValue={subject ?? ""} className="rounded-lg border border-line px-2 py-1.5">
            <option value="">{c.subject}</option>
            {SUBJECTS.map((s) => <option key={s} value={s}>{L.subject(s, lang)}</option>)}
          </select>
          <select name="level" defaultValue={level ?? ""} className="rounded-lg border border-line px-2 py-1.5">
            <option value="">{c.level}</option>
            {CLASS_LEVELS.map((l) => <option key={l} value={l}>{L.level(l as ClassLevel, lang)}</option>)}
          </select>
          <button className="btn-ghost px-3! py-1.5!">→</button>
          {(subject || level || sp.teacher) && <Link href="/packages" className="self-center text-ink-2 underline">×</Link>}
        </form>
      </div>
      {list.length === 0 ? <p className="mt-3 text-sm text-ink-3">{c.noneHere}</p> : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((p) => <PackageCard key={p.id} p={p} lang={lang} />)}</div>
      )}
    </div>
  );
}
