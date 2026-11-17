import Link from "next/link";
import { CLASS_SEGMENTS, CLASS_SEGMENT_LABEL, GROUP_LABEL, SEGMENT_LABEL, isSegment, packClass, packGroup, packsOfClass, segmentsOfLevel, type ClassLevel, type ContentSegment } from "@mastermoshai/core";
import { Flash } from "@/components/growth/Off";
import { accessContext, catalog } from "@/lib/biz/access";
import { CONTENT_PRICE, lockedSegment, myContentSubs } from "@/lib/biz/content-subs";
import { bizCopy } from "@/lib/copy-biz";
import { toolsCopy } from "@/lib/copy-tools";
import { DATA_LIVE } from "@/lib/data";
import { claimReferral, mustMe } from "@/lib/growth/page";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import { autoSegment, renewSegment, stopSegment } from "./actions";

export const dynamic = "force-dynamic";

export default async function Learn({ searchParams }: { searchParams: Promise<{ pack?: string; paid?: string; why?: string; renew?: string }> }) {
  const m = await mustMe("/learn");
  const lang = await getLang();
  const c = bizCopy(lang).learn;
  const kinds = toolsCopy(lang).teach.content.kinds;
  const sp = await searchParams;
  if (DATA_LIVE) await claimReferral(m.email);
  const ctx = await accessContext(m);
  const mine = DATA_LIVE ? await myContentSubs(m.email) : [];
  const locked = DATA_LIVE ? await lockedSegment(m.email) : null;
  // Default tab: their fixed pack, else the class they study with a tutor, else SSC science.
  const tutorClass = ctx.batches.flatMap((b) => segmentsOfLevel(b.level))[0];
  const guess: ContentSegment = locked ?? ctx.segments[0] ?? (tutorClass ? packsOfClass(tutorClass)[0]! : "SSC_SCIENCE");
  const pack: ContentSegment = isSegment(sp.pack) ? sp.pack : guess;
  const cls = packClass(pack), grp = packGroup(pack);
  const items = catalog(ctx, { segment: cls, group: grp ?? undefined });
  const segOpen = ctx.staff || ctx.segments.includes(pack);
  const otherLocked = Boolean(locked && locked !== pack);
  const freeSubjects = [...new Set(ctx.batches.filter((b) => segmentsOfLevel(b.level).includes(cls)).map((b) => b.subject))];

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-display text-4xl">{c.h1}</h1>
      <p className="mt-2 max-w-2xl text-ink-2">{c.sub}</p>
      {sp.paid === "1" && <Flash tone="ok" text={c.paid} />}
      {sp.paid === "0" && <Flash tone="bad" text={sp.why === "cancel" ? c.cancelled : c.failed} />}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl bg-board p-5 text-white">
          <p className="text-sm font-semibold text-gold">{c.freeH}</p>
          <p className="mt-2 text-[15px] text-white/85">{c.freeBody}</p>
          {freeSubjects.length > 0
            ? <p className="mt-3 text-sm">{c.via.teacher(null)}: <b>{L.subjects(freeSubjects, lang)}</b></p>
            : <Link href="/teachers" className="btn-gold mt-4 inline-flex px-4! py-2!">{c.freeHow}</Link>}
        </section>
        <section className="card p-5">
          <p className="font-semibold">{c.subH(CONTENT_PRICE)}</p>
          <p className="mt-2 text-sm text-ink-2">{c.subBody}</p>
          {segOpen ? <p className="mt-3 text-sm font-semibold text-leaf">{ctx.staff ? c.via.staff : c.already}</p>
            : otherLocked ? <p className="mt-3 rounded-lg bg-mist p-3 text-sm">{c.lockedTo(SEGMENT_LABEL[locked!][lang])} <Link href={`/learn?pack=${locked}`} className="font-semibold underline">{SEGMENT_LABEL[locked!][lang]}</Link></p>
            : <Link href={`/learn/buy/${pack}`} className="btn mt-4 inline-flex border-[#e2136e] bg-[#e2136e] px-4! py-2! text-white">{c.buy(CONTENT_PRICE)} · {SEGMENT_LABEL[pack][lang]}</Link>}
        </section>
      </div>

      {mine.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-2xl">{c.mine}</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {mine.map((s) => (
              <div key={s.id} className={`card p-4 ${sp.renew === s.id ? "ring-2 ring-gold" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <b>{SEGMENT_LABEL[s.segment][lang]}</b>
                  <span className={`tag ${s.status === "ACTIVE" ? "bg-home text-home-ink" : s.status === "PAST_DUE" ? "bg-redpen-tint text-redpen" : "bg-mist"}`}>{c.status[s.status]}</span>
                  <span className="text-sm text-ink-2">{L.taka(s.price, lang)}{lang === "bn" ? "/মাস" : "/month"}{s.student_email !== m.email ? ` · ${s.student_email}` : ""}</span>
                </div>
                {s.current_period_end && s.status !== "CANCELLED" && <div className="text-sm text-ink-3">{c.until(L.date(new Date(s.current_period_end), lang))}</div>}
                {s.status !== "CANCELLED" && s.payer_email === m.email && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <form action={renewSegment.bind(null, s.id)}><button className={s.status === "PAST_DUE" || sp.renew === s.id ? "btn-gold px-3! py-1.5!" : "btn-ghost px-3! py-1.5!"}>{c.renew}</button></form>
                    <form action={autoSegment.bind(null, s.id, !s.auto_renew)}>
                      <span className="text-ink-2">{c.auto}: {s.auto_renew ? c.autoOn : c.autoOff} · </span><button className="underline">{s.auto_renew ? c.turnOff : c.turnOn}</button>
                    </form>
                    {s.auto_renew && <form action={stopSegment.bind(null, s.id)} className="ml-auto"><button className="text-redpen">{c.cancel}</button></form>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <nav className="mt-10 flex flex-wrap gap-2" aria-label={c.pick}>
        {CLASS_SEGMENTS.map((k) => {
          const first = locked && packClass(locked) === k ? locked : packsOfClass(k)[0]!;
          return <Link key={k} href={`/learn?pack=${first}`} className={`tag px-3! py-1.5! text-sm ${k === cls ? "bg-board! text-white!" : ""}`}>{CLASS_SEGMENT_LABEL[k][lang]}</Link>;
        })}
      </nav>
      {grp && (
        <nav className="mt-2 flex flex-wrap gap-2 text-sm" aria-label={c.groupPick}>
          {packsOfClass(cls).map((p) => (
            <Link key={p} href={`/learn?pack=${p}`} className={`rounded-full border px-3 py-1 ${p === pack ? "border-board font-semibold" : "border-line text-ink-2"}`}>{GROUP_LABEL[packGroup(p)!][lang]}</Link>
          ))}
        </nav>
      )}

      {items.length === 0 ? <p className="mt-4 rounded-lg bg-mist p-6 text-center text-sm text-ink-2">{c.none}</p> : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {items.map((it) => (
            <li key={it.id} className="card flex flex-col p-4">
              <div className="text-xs text-ink-3">{L.subject(it.subject, lang)} · {L.level(it.level as ClassLevel, lang)} · {kinds[it.kind]} · {c.chapter(it.chapter)}{it.topics.length ? ` · ${c.topics(it.topics.length)}` : ""}</div>
              <div className="mt-1 font-medium">{it.title[lang]}</div>
              {it.access.open ? (
                <div className="mt-3 flex items-center gap-3">
                  <Link href={`/learn/${it.id}`} className="btn-board px-3! py-1.5! text-sm">{c.open}</Link>
                  <span className="text-xs font-semibold text-leaf">{it.access.via === "teacher" ? c.via.teacher(it.access.teacherName ?? null) : it.access.via === "subscription" ? c.via.subscription : c.via.staff}</span>
                </div>
              ) : (
                <div className="mt-3">
                  <span className="tag bg-mist">🔒 {c.locked}</span>
                  <p className="mt-2 text-xs text-ink-2">{c.lockedWhy}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <section className="card mt-8 flex flex-wrap items-center gap-3 p-5">
        <div><b>{c.exams}</b><p className="text-sm text-ink-2">{c.examsBody}</p></div>
        <Link href="/leaderboard" className="btn-ghost ml-auto px-4! py-2!">{c.goExams}</Link>
      </section>
    </div>
  );
}
