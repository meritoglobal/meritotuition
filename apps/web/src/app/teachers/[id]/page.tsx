import { notFound } from "next/navigation";
import { CLASS_LEVEL_LABEL, DEMO_TEACHERS, DEMO_VIDEOS, formatTaka, hasTrialSeat } from "@mastermoshai/core";
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
  const videos = DEMO_VIDEOS.filter((v) => v.teacherId === t.id);
  const trial = t.routine.some(hasTrialSeat);
  return (
    <>
      <section className="border-b-2 border-ink bg-lilac">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 md:flex-row md:items-end">
          <Avatar t={t} size="lg" />
          <div className="flex-1">
            <div className="flex flex-wrap gap-2">
              {t.verified ? <span className="tag bg-ink text-white">✓ Verified {t.university} student</span> : <span className="tag bg-paper">Verification pending</span>}
              {t.modes.map((m) => <span key={m} className="tag bg-paper">{m === "ONLINE" ? "Online" : `Home tutor · ${t.area?.name ?? ""}`}</span>)}
            </div>
            <h1 className="font-display mt-3 text-5xl font-extrabold sm:text-6xl">{t.name}</h1>
            <p className="mt-2 text-lg font-medium">{t.university} · {t.department}</p>
          </div>
          <div className="flex gap-8">
            <Stat k={`${t.rating.toFixed(1)} ★`} v={`${t.reviewCount} reviews`} />
            <Stat k={String(t.freeVideoCount)} v="free classes" />
            <Stat k={formatTaka(t.fromPrice)} v="per month, from" />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="font-display text-3xl font-extrabold">About</h2>
          <p className="mt-3 max-w-2xl text-lg">{t.bio}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {t.subjects.map((s) => <span key={s} className="tag bg-mist text-sm!">{s}</span>)}
            {t.levels.map((l) => <span key={l} className="tag bg-mist text-sm!">{CLASS_LEVEL_LABEL[l]}</span>)}
          </div>

          <h2 id="routine" className="font-display mt-12 text-3xl font-extrabold">Weekly routine</h2>
          <p className="mb-4 mt-1 text-ink-2">Pick a batch with an open seat. Times are Dhaka time.</p>
          <RoutineList slots={t.routine} teacherId={t.id} />

          {videos.length > 0 && (
            <>
              <h2 className="font-display mt-12 text-3xl font-extrabold">Free classes by {t.name.split(" ")[0]}</h2>
              <div className="mt-5 grid gap-6 sm:grid-cols-2">{videos.map((v, i) => <VideoCard key={v.id} v={v} i={i} />)}</div>
            </>
          )}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card border-ink! p-6">
            <div className="font-display text-4xl font-extrabold">{formatTaka(t.fromPrice)}</div>
            <div className="text-ink-2">per month, from</div>
            <a href="#routine" className={`${trial ? "btn-sun" : "btn-ink"} mt-5 w-full`}>{trial ? "Book free trial" : "Choose a batch"}</a>
            <ul className="mt-5 space-y-3 text-sm">
              <li><b>Paid class by class.</b> Your money is held by Mastermoshai and released after each class.</li>
              <li><b>No-show refund.</b> Tutor absent 15 min, that class comes back to you.</li>
              <li><b>Stop any time.</b> Untaught classes are refunded.</li>
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
