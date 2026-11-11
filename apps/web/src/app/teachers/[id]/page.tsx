import { notFound } from "next/navigation";
import { CLASS_LEVEL_LABEL, DEMO_TEACHERS, DEMO_VIDEOS, formatTaka } from "@porao/core";
import { RoutineList } from "@/components/Routine";
import { initials } from "@/components/TeacherCard";
import { VideoCard } from "@/components/VideoCard";

export function generateStaticParams() {
  return DEMO_TEACHERS.map((t) => ({ id: t.id }));
}

export default async function TeacherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = DEMO_TEACHERS.find((x) => x.id === id);
  if (!t) notFound();
  const videos = DEMO_VIDEOS.filter((v) => v.teacherId === t.id);
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 sm:flex-row">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-brand-100 text-3xl font-semibold text-brand-700">{initials(t.name)}</div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{t.name}</h1>
            {t.verified ? (
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">✓ Verified {t.university} student</span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">Verification pending</span>
            )}
          </div>
          <p className="text-slate-600">{t.university} · {t.department}</p>
          <p className="mt-3 text-slate-700">{t.bio}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="font-medium text-amber-600">★ {t.rating.toFixed(1)} · {t.reviewCount} reviews</span>
            <span className="text-slate-400">|</span>
            <span>{t.subjects.join(", ")}</span>
            <span className="text-slate-400">|</span>
            <span>{t.levels.map((l) => CLASS_LEVEL_LABEL[l]).join(", ")}</span>
            {t.area && (
              <>
                <span className="text-slate-400">|</span>
                <span>Home tutoring within {t.area.radiusKm} km of {t.area.name}</span>
              </>
            )}
          </div>
        </div>
        <div className="rounded-2xl bg-brand-50 p-4 text-center sm:w-48">
          <div className="text-sm text-slate-600">from</div>
          <div className="text-2xl font-bold text-brand-900">{formatTaka(t.fromPrice)}</div>
          <div className="text-sm text-slate-600">per month</div>
          <a href="#routine" className="mt-3 block rounded-full bg-brand-600 py-2 text-sm font-semibold text-white">See free slots</a>
        </div>
      </div>

      <h2 id="routine" className="mb-3 mt-10 text-xl font-bold">Weekly routine and open seats</h2>
      <RoutineList slots={t.routine} teacherId={t.id} />
      <p className="mt-2 text-xs text-slate-500">You pay in advance and Porao holds it. Each class is paid to the tutor only after it happens. Missed classes come back to you.</p>

      {videos.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-xl font-bold">Free classes by {t.name.split(" ")[0]}</h2>
          <div className="grid gap-4 sm:grid-cols-3">{videos.map((v) => <VideoCard key={v.id} v={v} />)}</div>
        </>
      )}
    </div>
  );
}
