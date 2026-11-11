import { notFound } from "next/navigation";
import { DEMO_TEACHERS, DEMO_VIDEOS, hasTrialSeat } from "@mastermoshai/core";
import { copy } from "@/lib/copy";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import { RoutineList } from "@/components/Routine";
import { Avatar } from "@/components/TeacherCard";
import { VideoCard } from "@/components/VideoCard";

export function generateStaticParams() {
  return DEMO_TEACHERS.map((t) => ({ id: t.id }));
}

export default async function TeacherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = DEMO_TEACHERS.find((x) => x.id === id);
  if (!t) notFound();
  const lang = await getLang();
  const c = copy(lang).profile;
  const card = copy(lang).card;
  const videos = DEMO_VIDEOS.filter((v) => v.teacherId === t.id);
  const trial = t.routine.some(hasTrialSeat);
  return (
    <>
      <section className="border-b-2 border-ink bg-lilac">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 md:flex-row md:items-end">
          <Avatar t={t} size="lg" lang={lang} />
          <div className="flex-1">
            <div className="flex flex-wrap gap-2">
              {t.verified ? <span className="tag bg-ink text-white">{c.verified(L.uni(t.university, lang))}</span> : <span className="tag bg-paper">{c.pending}</span>}
              {t.modes.map((m) => <span key={m} className="tag bg-paper">{m === "ONLINE" ? c.online : c.home(L.area(t.area?.name ?? "", lang))}</span>)}
            </div>
            <h1 className="font-display mt-3 text-5xl font-extrabold sm:text-6xl">{L.name(t, lang)}</h1>
            <p className="mt-2 text-lg font-medium">{L.uni(t.university, lang)} · {L.dept(t, lang)}</p>
          </div>
          <div className="flex gap-8">
            <Stat k={`${L.num(t.rating.toFixed(1), lang)} ★`} v={card.reviews(t.reviewCount)} />
            <Stat k={L.num(t.freeVideoCount, lang)} v={card.videos} />
            <Stat k={L.taka(t.fromPrice, lang)} v={card.from} />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="font-display text-3xl font-extrabold">{c.about}</h2>
          <p className="mt-3 max-w-2xl text-lg">{L.bio(t, lang)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {t.subjects.map((s) => <span key={s} className="tag bg-mist text-sm!">{L.subject(s, lang)}</span>)}
            {t.levels.map((l) => <span key={l} className="tag bg-mist text-sm!">{L.level(l, lang)}</span>)}
          </div>

          <h2 id="routine" className="font-display mt-12 text-3xl font-extrabold">{c.routine}</h2>
          <p className="mb-4 mt-1 text-ink-2">{c.routineSub}</p>
          <RoutineList slots={t.routine} teacherId={t.id} lang={lang} />

          {videos.length > 0 && (
            <>
              <h2 className="font-display mt-12 text-3xl font-extrabold">{c.freeBy(L.firstName(t, lang))}</h2>
              <div className="mt-5 grid gap-6 sm:grid-cols-2">{videos.map((v, i) => <VideoCard key={v.id} v={v} i={i} lang={lang} />)}</div>
            </>
          )}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card border-ink! p-6">
            <div className="font-display text-4xl font-extrabold">{L.taka(t.fromPrice, lang)}</div>
            <div className="text-ink-2">{card.from}</div>
            <a href="#routine" className={`${trial ? "btn-sun" : "btn-ink"} mt-5 w-full`}>{trial ? c.trial : c.choose}</a>
            <ul className="mt-5 space-y-3 text-sm">
              {c.promises.map(([h, p]) => <li key={h}><b>{h}</b> {p}</li>)}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="font-display text-2xl font-extrabold">{k}</div>
      <div className="text-sm">{v}</div>
    </div>
  );
}
