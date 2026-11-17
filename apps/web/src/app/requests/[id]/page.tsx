import Link from "next/link";
import { notFound } from "next/navigation";
import type { ClassLevel } from "@mastermoshai/core";
import { Off } from "@/components/growth/Off";
import { growthCopy } from "@/lib/copy-growth";
import { marketCopy } from "@/lib/copy-market";
import { DATA_LIVE } from "@/lib/data";
import { getLang } from "@/lib/lang";
import { L } from "@/lib/l10n";
import { mustMe } from "@/lib/growth/page";
import { isUuid } from "@/lib/growth/people";
import { bidsFor, getRequest, isLive, suggestions, type TutorCard } from "@/lib/growth/requests";
import { choose, closeReq, inviteTutor, messageTutor, reopenReq } from "../actions";

export const dynamic = "force-dynamic";

function Tutor({ t, lang }: { t: TutorCard; lang: "bn" | "en" }) {
  const c = marketCopy(lang).req;
  return (
    <div>
      <Link href={`/tutor/${encodeURIComponent(t.id)}`} className="font-semibold hover:underline">{t.name}</Link>
      {t.pro && <span className="tag ml-2 bg-gold text-ink">{marketCopy(lang).pro.badge}</span>}
      {t.headline && <div className="text-sm text-ink-2">{t.headline}</div>}
      <div className="mt-0.5 text-xs text-ink-3">
        {[t.university && L.uni(t.university, lang), t.department, t.area && L.area(t.area, lang), t.distanceKm !== null && c.away(t.distanceKm)].filter(Boolean).join(" · ")}
      </div>
    </div>
  );
}

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await mustMe(`/requests/${id}`);
  const lang = await getLang();
  const c = marketCopy(lang).req;
  if (!DATA_LIVE) return <div className="mx-auto max-w-4xl px-5 py-10"><h1 className="font-display text-4xl">{c.h1}</h1><Off text={growthCopy(lang).off} /></div>;
  if (!isUuid(id)) notFound();
  const r = await getRequest(id);
  if (!r) notFound();
  if (r.student_email !== m.email) return <div className="mx-auto max-w-4xl px-5 py-10"><Off text={c.notYours} /></div>;
  const live = isLive(r);
  const [bids, more] = await Promise.all([bidsFor(r.id), live ? suggestions(r) : Promise.resolve([])]);
  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/requests" className="text-sm text-ink-3 hover:text-ink">← {c.mine}</Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">{L.subject(r.subject, lang)} · {L.level(r.level as ClassLevel, lang)}</h1>
          <p className="mt-1 text-sm text-ink-2">{r.mode === "HOME" ? `${c.home}, ${L.area(r.area ?? "", lang)}` : c.online} · {c.perMonth(r.budget)} · {c.daysN(r.days_per_week)}</p>
          {r.note && <p className="mt-1 text-sm text-ink-3">“{r.note}”</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="tag bg-mist">{r.status === "OPEN" && !live ? c.expired : c.status[r.status]}</span>
          {live
            ? <form action={closeReq.bind(null, r.id)}><button className="btn-ghost px-3! py-1.5! text-sm">{c.close}</button></form>
            : <form action={reopenReq.bind(null, r.id)}><button className="btn-ghost px-3! py-1.5! text-sm">{c.reopen}</button></form>}
        </div>
      </div>
      {r.status === "MATCHED" && <p className="mt-4 rounded-lg bg-home p-3 text-sm text-home-ink">{c.matchedNote}</p>}

      <h2 className="mt-8 font-semibold">{c.bidsH}</h2>
      {bids.length === 0 ? <p className="mt-2 text-sm text-ink-3">{c.noBids}</p> : (
        <ul className="mt-2 grid gap-3">
          {bids.map((b) => (
            <li key={b.id} className={`card p-4 ${b.status === "ACCEPTED" ? "border-leaf!" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                {b.tutor ? <Tutor t={b.tutor} lang={lang} /> : <div className="font-semibold">{b.teacher_name}</div>}
                <div className="text-right font-display text-2xl">{L.taka(b.price, lang)}<span className="text-sm text-ink-3">/{lang === "bn" ? "মাস" : "mo"}</span></div>
              </div>
              {b.message && <p className="mt-2 whitespace-pre-wrap text-sm">{b.message}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {b.status === "ACCEPTED" && <span className="tag bg-home text-home-ink">{c.chosen}</span>}
                {live && b.status === "PENDING" && <form action={choose.bind(null, r.id, b.id)}><button className="btn-gold px-3! py-1.5! text-sm">{c.choose}</button></form>}
                <form action={messageTutor.bind(null, r.id, b.id)}><button className="btn-ghost px-3! py-1.5! text-sm">{c.message}</button></form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {live && (
        <>
          <h2 className="mt-10 font-semibold">{c.activeH}</h2>
          <p className="mt-1 text-sm text-ink-2">{c.activeSub}</p>
          {more.length === 0 ? <p className="mt-2 text-sm text-ink-3">{c.noActive}</p> : (
            <ul className="mt-3 grid gap-3 md:grid-cols-2">
              {more.map((t) => (
                <li key={t.id} className="card flex items-start justify-between gap-3 p-4">
                  <div>
                    <Tutor t={t} lang={lang} />
                    {t.price && <div className="mt-1 text-sm">{c.perMonth(t.price)}</div>}
                  </div>
                  {t.invited ? <span className="tag bg-mist">{c.invited}</span>
                    : <form action={inviteTutor.bind(null, r.id, t.id)}><button className="btn-board px-3! py-1.5! text-sm">{c.invite}</button></form>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 text-sm text-ink-2">{c.search} <Link href="/teachers" className="font-semibold underline">{c.searchLink}</Link></p>
        </>
      )}
    </div>
  );
}
