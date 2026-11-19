import Link from "next/link";
import { Off } from "@/components/growth/Off";
import { growthCopy } from "@/lib/copy-growth";
import { DATA_LIVE } from "@/lib/data";
import { getLang } from "@/lib/lang";
import { L } from "@/lib/l10n";
import { mustMe } from "@/lib/growth/page";
import { children, guardiansOf, reportText, weeklyReport } from "@/lib/growth/parent";
import { weekStart } from "@/lib/growth/people";
import { linkChild, makeCode, setWeeklyEmail } from "./actions";
import { LinkChild, MakeCode } from "./Forms";
import { Report } from "./Report";

export const dynamic = "force-dynamic";

const shift = (week: string, days: number) => new Date(new Date(`${week}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);

export default async function ParentPage({ searchParams }: { searchParams: Promise<{ child?: string; week?: string }> }) {
  const m = await mustMe("/parent");
  const lang = await getLang();
  const c = growthCopy(lang).parent;
  if (!DATA_LIVE) return <div className="mx-auto max-w-5xl px-5 py-10"><h1 className="font-display text-4xl">{c.h1}</h1><Off text={growthCopy(lang).off} /></div>;

  const sp = await searchParams;
  const [kids, myGuardians] = await Promise.all([children(m.email), guardiansOf(m.email)]);
  const current = weekStart();
  const week = sp.week && /^\d{4}-\d{2}-\d{2}$/.test(sp.week) && sp.week <= current ? weekStart(new Date(`${sp.week}T12:00:00+06:00`)) : current;
  const kid = kids.find((k) => k.student_email === sp.child) ?? kids[0];
  const report = kid ? await weeklyReport(kid.student_email, kid.student_id, week) : null;
  const name = kid ? kid.student_name || kid.student_email.split("@")[0]! : "";
  const href = (w: string) => `/parent?child=${encodeURIComponent(kid?.student_email ?? "")}&week=${w}`;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="font-display text-4xl">{c.h1}</h1>
      <p className="mt-2 max-w-2xl text-ink-2">{c.sub}</p>

      {kids.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {kids.map((k) => (
            <Link key={k.student_email} href={`/parent?child=${encodeURIComponent(k.student_email)}`}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${k.student_email === kid?.student_email ? "border-board bg-board text-white" : "border-line"}`}>
              {k.student_name || k.student_email.split("@")[0]}
            </Link>
          ))}
        </div>
      )}

      {kid && report ? (
        <section className="mt-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl">{name}</h2>
            <span className="text-sm text-ink-3">{c.week(L.date(new Date(`${week}T12:00:00+06:00`), lang))}</span>
            <div className="ml-auto flex flex-wrap gap-2 text-sm">
              <Link href={href(shift(week, -7))} className="btn-ghost px-3! py-1.5!">← {c.prev}</Link>
              {week < current && <Link href={href(shift(week, 7))} className="btn-ghost px-3! py-1.5!">{c.next} →</Link>}
              <a href={`https://wa.me/?text=${encodeURIComponent(reportText(report, name))}`} target="_blank" rel="noreferrer" className="btn-board px-3! py-1.5!">{c.whatsapp}</a>
            </div>
          </div>
          <div className="mt-4"><Report r={report} lang={lang} /></div>
          <form action={setWeeklyEmail.bind(null, kid.student_email, !kid.weekly_email)} className="mt-3 text-sm text-ink-2">
            ✉ {kid.weekly_email ? c.emailOn : c.emailOff} · <button className="underline">{kid.weekly_email ? growthCopy(lang).pkg.turnOff : growthCopy(lang).pkg.turnOn}</button>
          </form>
        </section>
      ) : (
        <p className="mt-6 text-sm text-ink-3">{c.none}</p>
      )}

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold">{c.linkH}</h2>
          <p className="mt-1 text-sm text-ink-2">{c.linkBody}</p>
          <LinkChild action={linkChild} />
        </section>
        <section className="card bg-gold-tint p-5">
          <h2 className="font-semibold">{c.studentH}</h2>
          <p className="mt-1 text-sm text-ink-2">{c.studentBody}</p>
          <MakeCode action={makeCode} />
          {myGuardians.length > 0 && <p className="mt-3 text-xs text-ink-3">{c.guardians(myGuardians.length)}</p>}
        </section>
      </div>
    </div>
  );
}
