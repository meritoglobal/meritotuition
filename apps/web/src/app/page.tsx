import Link from "next/link";
import { CLASS_LEVELS, DEMO_TEACHERS, DEMO_VIDEOS, DHAKA_AREAS, SUBJECTS, rankScore } from "@mastermoshai/core";
import { TeacherCard } from "@/components/TeacherCard";
import { VideoCard } from "@/components/VideoCard";
import { copy, type Copy } from "@/lib/copy";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";

export default async function Home() {
  const lang = await getLang();
  const c = copy(lang).home;
  const top = [...DEMO_TEACHERS].sort((a, b) => rankScore(b) - rankScore(a)).slice(0, 3);
  return (
    <>
      {/* HERO: full-bleed flat colour block */}
      <section className="border-b-2 border-ink bg-sun">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-14 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <span className="inline-block -rotate-2 rounded-lg border-2 border-ink bg-paper px-3 py-1 text-sm font-bold">{c.badge}</span>
            <h1 className="font-display mt-5 text-5xl font-extrabold leading-[0.95] sm:text-7xl">{c.h1}</h1>
            <ul className="mt-6 space-y-2 text-lg font-medium">
              {c.bullets.map((x) => (
                <li key={x} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ink text-xs text-sun">✓</span>
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <LiveClassMock m={c.mock} />
        </div>
        {/* search bar (Preply-style labelled fields) */}
        <div className="mx-auto max-w-7xl px-5 pb-12">
          <form action="/teachers" className="grid gap-2 rounded-xl border-2 border-ink bg-paper p-2 shadow-[6px_6px_0_0_#121117] md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <label className="field border-0!">
              <span>{c.form.subject}</span>
              <select name="subjects" defaultValue="">
                <option value="">{c.form.anySubject}</option>
                {SUBJECTS.map((s) => <option key={s} value={s}>{L.subject(s, lang)}</option>)}
              </select>
            </label>
            <label className="field border-0!">
              <span>{c.form.level}</span>
              <select name="level" defaultValue="">
                <option value="">{c.form.anyLevel}</option>
                {CLASS_LEVELS.map((l) => <option key={l} value={l}>{L.level(l, lang)}</option>)}
              </select>
            </label>
            <label className="field border-0!">
              <span>{c.form.how}</span>
              <select name="mode" defaultValue="">
                <option value="">{c.form.anyHow}</option>
                <option value="ONLINE">{c.form.online}</option>
                <option value="OFFLINE">{c.form.offline}</option>
              </select>
            </label>
            <label className="field border-0!">
              <span>{c.form.area}</span>
              <select name="area" defaultValue="Farmgate">
                {Object.keys(DHAKA_AREAS).map((a) => <option key={a} value={a}>{L.area(a, lang)}</option>)}
              </select>
            </label>
            <button className="btn-ink text-base">{c.form.submit}</button>
          </form>
        </div>
      </section>

      {/* TRUST STATS (GoStudent-style row) */}
      <section className="border-b-2 border-ink">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x-2 divide-ink md:grid-cols-4">
          {c.stats.map(([k, v]) => (
            <div key={k} className="px-5 py-6">
              <div className="font-display text-3xl font-extrabold">{k}</div>
              <div className="text-sm text-ink-2">{v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TWO WAYS TO LEARN */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <h2 className="font-display max-w-3xl text-4xl font-extrabold leading-none sm:text-6xl">{c.two.h2}</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Link href="/teachers?mode=ONLINE" className="group rounded-xl border-2 border-ink bg-lilac p-8 transition hover:-translate-y-1">
            <div className="text-sm font-bold uppercase tracking-wide">{c.two.onLabel}</div>
            <div className="font-display mt-2 text-4xl font-extrabold">{c.two.onTitle}</div>
            <p className="mt-3 max-w-md text-lg">{c.two.onText}</p>
            <div className="mt-6 font-semibold group-hover:underline">{c.two.onLink}</div>
          </Link>
          <Link href="/teachers?mode=OFFLINE" className="group rounded-xl border-2 border-ink bg-mint p-8 transition hover:-translate-y-1">
            <div className="text-sm font-bold uppercase tracking-wide">{c.two.offLabel}</div>
            <div className="font-display mt-2 text-4xl font-extrabold">{c.two.offTitle}</div>
            <p className="mt-3 max-w-md text-lg">{c.two.offText}</p>
            <div className="mt-6 font-semibold group-hover:underline">{c.two.offLink}</div>
          </Link>
        </div>
      </section>

      {/* THREE STEPS */}
      <section className="bg-ink py-20 text-white">
        <div className="mx-auto max-w-7xl px-5">
          <h2 className="font-display text-4xl font-extrabold sm:text-6xl">{c.how.h2}</h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {c.how.steps.map(([h, p], i) => (
              <div key={h}>
                <div className="font-display text-7xl font-extrabold text-sun">{L.num(`0${i + 1}`, lang)}</div>
                <div className="font-display mt-3 text-2xl font-extrabold">{h}</div>
                <p className="mt-2 text-white/70">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FREE CLASSES */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-4xl font-extrabold sm:text-5xl">{c.freeH2}</h2>
          <Link href="/videos" className="hidden shrink-0 font-semibold underline underline-offset-4 sm:block">{c.freeAll}</Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {DEMO_VIDEOS.slice(0, 4).map((v, i) => <VideoCard key={v.id} v={v} i={i} lang={lang} />)}
        </div>
      </section>

      {/* TOP TUTORS */}
      <section className="mx-auto max-w-7xl px-5">
        <h2 className="font-display text-4xl font-extrabold sm:text-5xl">{c.topH2}</h2>
        <div className="mt-8 space-y-4">
          {top.map((t, i) => <TeacherCard key={t.id} t={t} highlight={i === 0} lang={lang} />)}
        </div>
      </section>

      {/* GUARANTEE */}
      <section className="mx-auto mt-20 max-w-7xl px-5">
        <div className="grid gap-8 rounded-xl border-2 border-ink bg-coral p-10 md:grid-cols-[1.4fr_1fr] md:items-center">
          <h2 className="font-display text-4xl font-extrabold leading-none text-ink sm:text-6xl">{c.guarantee.h2}</h2>
          <ul className="space-y-3 text-lg font-medium">
            {c.guarantee.items.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </div>
      </section>

      {/* TEACH */}
      <section className="mx-auto mt-20 grid max-w-7xl gap-8 px-5 md:grid-cols-2 md:items-center">
        <div>
          <h2 className="font-display text-4xl font-extrabold leading-none sm:text-6xl">{c.teach.h2}</h2>
          <p className="mt-4 text-lg text-ink-2">{c.teach.text}</p>
          <Link href="/dashboard/teacher" className="btn-ink mt-6">{c.teach.cta}</Link>
        </div>
        <div className="card grid grid-cols-2 gap-px overflow-hidden bg-line p-0">
          {c.teach.cards.map(([k, v]) => (
            <div key={k} className="bg-paper p-6">
              <div className="text-sm text-ink-2">{k}</div>
              <div className="mt-1 text-lg font-bold">{v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto mt-20 max-w-3xl px-5">
        <h2 className="font-display text-4xl font-extrabold">{c.faqH2}</h2>
        <div className="mt-6 divide-y-2 divide-line border-y-2 border-line">
          {c.faq.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                {q}
                <span className="text-2xl transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-ink-2">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

/** A real-looking class card instead of stock photos. */
function LiveClassMock({ m }: { m: Copy["home"]["mock"] }) {
  return (
    <div className="relative">
      <div className="rotate-2 rounded-xl border-2 border-ink bg-paper p-4 shadow-[8px_8px_0_0_#121117]">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold">{m.title}</span>
          <span className="tag bg-coral text-ink">{m.live}</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="col-span-2 row-span-2 grid aspect-video place-items-center rounded-lg bg-ink font-display text-lg text-white">F = m × a</div>
          <div className="grid place-items-center rounded-lg bg-lilac text-xs font-bold">{m.student}</div>
          <div className="grid place-items-center rounded-lg bg-mint text-xs font-bold">{m.tutor}</div>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-ink-2">{m.joined}</span>
          <span className="font-semibold">{m.timer}</span>
        </div>
      </div>
      <div className="absolute -bottom-6 -left-4 -rotate-3 rounded-lg border-2 border-ink bg-paper px-4 py-3 text-sm shadow-[4px_4px_0_0_#121117]">
        <div className="font-bold">{m.released}</div>
        <div className="text-ink-2">{m.after}</div>
      </div>
    </div>
  );
}
