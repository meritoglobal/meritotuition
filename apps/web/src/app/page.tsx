import Link from "next/link";
import { DEMO_TEACHERS, DEMO_VIDEOS, rankScore } from "@mastermoshai/core";
import { HeroSearch } from "@/components/HeroSearch";
import { Scribble } from "@/components/Scribble";
import { TeacherCard } from "@/components/TeacherCard";
import { VideoCard } from "@/components/VideoCard";
import { copy, type Copy } from "@/lib/copy";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";

export default async function Home() {
  const lang = await getLang();
  const c = copy(lang).home;
  const top = [...DEMO_TEACHERS].sort((a, b) => rankScore(b) - rankScore(a)).slice(0, 3);
  const [a, mark, b] = c.h1Parts;
  const [ga, gmark, gb] = c.guarantee.h2Parts;
  return (
    <>
      {/* HERO: the blackboard */}
      <section className="bg-board text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 pb-10 pt-14 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:pt-20">
          <div>
            <p className="text-[15px] font-semibold text-gold">{c.badge}</p>
            <h1 className="font-display mt-4 text-[44px] leading-[1.05] sm:text-[64px]">
              {a}
              <Scribble>{mark}</Scribble>
              {b}
            </h1>
            <ul className="mt-7 max-w-xl space-y-2.5 text-[17px] text-white/80">
              {c.bullets.map((x) => (
                <li key={x} className="flex gap-3">
                  <span className="mt-[0.7em] h-px w-4 shrink-0 bg-gold" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <PhoneMock p={c.phone} />
        </div>

        {/* search: Preply-style labelled fields on a plain white bar */}
        <div className="mx-auto max-w-7xl px-5 pb-14">
          <HeroSearch />
          <div className="mt-6 grid grid-cols-2 gap-y-4 text-sm md:grid-cols-4">
            {c.stats.map(([k, v]) => (
              <div key={k} className="border-l border-board-line pl-4">
                <div className="text-lg font-bold text-white">{k}</div>
                <div className="text-white/60">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TWO WAYS TO LEARN */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <h2 className="font-display max-w-3xl text-4xl leading-tight sm:text-5xl">{c.two.h2}</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Link href="/teachers/online" className="group rounded-xl border border-line bg-online p-8 transition-colors hover:border-online-ink/40">
            <div className="text-sm font-semibold text-online-ink">{c.two.onLabel}</div>
            <div className="font-display mt-2 text-3xl">{c.two.onTitle}</div>
            <p className="mt-3 max-w-md text-[17px] text-ink-2">{c.two.onText}</p>
            <div className="mt-6 font-semibold text-online-ink group-hover:underline">{c.two.onLink}</div>
          </Link>
          <Link href="/teachers/home" className="group rounded-xl border border-line bg-home p-8 transition-colors hover:border-home-ink/40">
            <div className="text-sm font-semibold text-home-ink">{c.two.offLabel}</div>
            <div className="font-display mt-2 text-3xl">{c.two.offTitle}</div>
            <p className="mt-3 max-w-md text-[17px] text-ink-2">{c.two.offText}</p>
            <div className="mt-6 font-semibold text-home-ink group-hover:underline">{c.two.offLink}</div>
          </Link>
        </div>
      </section>

      {/* THREE STEPS: a ruled notebook page, not giant numerals */}
      <section className="bg-chalk py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[1fr_1.4fr]">
          <h2 className="font-display text-4xl leading-tight sm:text-5xl">{c.how.h2}</h2>
          <ol className="divide-y divide-chalk-2 border-y border-chalk-2">
            {c.how.steps.map(([h, p], i) => (
              <li key={h} className="grid grid-cols-[3rem_1fr] gap-4 py-6">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-board text-sm font-bold text-white">{L.num(i + 1, lang)}</span>
                <div>
                  <div className="text-xl font-bold">{h}</div>
                  <p className="mt-1 text-ink-2">{p}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FREE CLASSES */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-4xl leading-tight sm:text-5xl">{c.freeH2}</h2>
          <Link href="/videos" className="hidden shrink-0 font-semibold underline underline-offset-4 sm:block">{c.freeAll}</Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {DEMO_VIDEOS.slice(0, 4).map((v, i) => <VideoCard key={v.id} v={v} i={i} lang={lang} />)}
        </div>
      </section>

      {/* TOP TUTORS */}
      <section className="mx-auto max-w-7xl px-5">
        <h2 className="font-display text-4xl leading-tight sm:text-5xl">{c.topH2}</h2>
        <div className="mt-8 space-y-4">
          {top.map((t, i) => <TeacherCard key={t.id} t={t} highlight={i === 0} lang={lang} />)}
        </div>
      </section>

      {/* GUARANTEE: the rules in red ink */}
      <section className="mx-auto mt-20 max-w-7xl px-5">
        <div className="grid gap-10 rounded-xl border border-line p-8 sm:p-10 md:grid-cols-[1.1fr_1fr] md:items-center">
          <h2 className="font-display text-4xl leading-tight sm:text-5xl">
            {ga}
            <Scribble color="var(--color-redpen)">{gmark}</Scribble>
            {gb}
          </h2>
          <div>
            <div className="eyebrow text-redpen!">{c.guarantee.rule}</div>
            <dl className="mt-3 divide-y divide-line border-y border-line">
              {c.guarantee.items.map((x) => {
                const [when, then] = x.split("→").map((s) => s.trim());
                return (
                  <div key={x} className="flex items-baseline justify-between gap-6 py-3.5">
                    <dt className="text-ink-2">{when}</dt>
                    <dd className="shrink-0 text-right font-semibold text-redpen">{then}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      </section>

      {/* TEACH */}
      <section className="mx-auto mt-20 max-w-7xl px-5">
        <div className="grid gap-10 rounded-xl bg-board p-8 text-white sm:p-12 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="font-display text-4xl leading-tight sm:text-5xl">{c.teach.h2}</h2>
            <p className="mt-4 text-[17px] text-white/75">{c.teach.text}</p>
            <Link href="/dashboard/teacher" className="btn-gold mt-7">{c.teach.cta}</Link>
          </div>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-board-line">
            {c.teach.cards.map(([k, v]) => (
              <div key={k} className="bg-board-2 p-6">
                <dt className="text-sm text-white/60">{k}</dt>
                <dd className="mt-1 text-lg font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto mt-20 max-w-3xl px-5">
        <h2 className="font-display text-4xl">{c.faqH2}</h2>
        <div className="mt-6 divide-y divide-line border-y border-line">
          {c.faq.map(([q, ans]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                {q}
                <span className="text-2xl font-normal text-ink-3 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-ink-2">{ans}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

/** The product itself (waiting room on a phone), instead of stock photos. */
function PhoneMock({ p }: { p: Copy["home"]["phone"] }) {
  return (
    <div className="mx-auto w-[290px] rounded-[2.6rem] border-[10px] border-black bg-black lg:mr-0">
      <div className="overflow-hidden rounded-[2rem] bg-paper text-ink">
        <div className="flex items-center justify-between px-6 pb-1 pt-3 text-[11px] font-semibold">
          <span>{p.time}</span>
          <span className="h-4 w-16 rounded-full bg-black" />
          <span>●●●</span>
        </div>
        <div className="px-5 pb-6 pt-3">
          <div className="text-xs text-ink-3">{p.room}</div>
          <div className="mt-0.5 text-lg font-bold leading-snug">{p.cls}</div>
          <div className="text-xs text-ink-3">{p.batch}</div>
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-line p-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-home text-sm font-bold text-home-ink">{p.tutor.slice(0, 1)}</div>
            <div>
              <div className="text-sm font-semibold">{p.tutor}</div>
              <div className="text-[11px] text-ink-3">{p.uni}</div>
            </div>
          </div>
          <div className="mx-auto mt-6 grid h-32 w-32 place-items-center rounded-full border-[6px] border-chalk-2">
            <div className="text-center">
              <div className="text-[11px] text-ink-3">{p.starts}</div>
              <div className="text-2xl font-bold tabular-nums">{p.left}</div>
            </div>
          </div>
          <div className="mt-6 rounded-lg bg-mist py-3 text-center text-[13px] font-semibold text-ink-3">{p.join}</div>
          <div className="mt-3 text-center text-[11px] leading-snug text-ink-3">{p.note}</div>
        </div>
      </div>
    </div>
  );
}
