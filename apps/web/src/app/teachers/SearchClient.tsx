"use client";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { CLASS_LEVELS, CLASS_LEVEL_LABEL, DEMO_TEACHERS, DHAKA_AREAS, SUBJECTS, searchTeachers, type ClassLevel, type Subject, type TeachingMode } from "@merito/core";
import { TeacherCard } from "@/components/TeacherCard";

const TutorMap = dynamic(() => import("@/components/TutorMap"), { ssr: false, loading: () => <div className="h-full animate-pulse rounded-2xl bg-slate-200" /> });

const UNIS = ["", "BUET", "University of Dhaka", "North South University", "Jahangirnagar University"];

export default function SearchClient(init: { subjects?: string; level?: string; mode?: string; area?: string }) {
  const [subjects, setSubjects] = useState<Subject[]>(init.subjects ? (init.subjects.split(",") as Subject[]) : []);
  const [level, setLevel] = useState<ClassLevel | "">((init.level as ClassLevel) ?? "");
  const [mode, setMode] = useState<TeachingMode | "">((init.mode as TeachingMode) ?? "");
  const [area, setArea] = useState(init.area && DHAKA_AREAS[init.area] ? init.area : "Farmgate");
  const [km, setKm] = useState(5);
  const [uni, setUni] = useState("");
  const [trial, setTrial] = useState(false);
  const [maxPrice, setMaxPrice] = useState(10000);

  const center = DHAKA_AREAS[area]!;
  const hits = useMemo(
    () =>
      searchTeachers(DEMO_TEACHERS, {
        subjects,
        level: level || undefined,
        mode: mode || undefined,
        near: center,
        maxDistanceKm: km,
        university: uni || undefined,
        freeTrialOnly: trial,
        maxPrice,
      }),
    [subjects, level, mode, center, km, uni, trial, maxPrice],
  );

  const toggle = (s: Subject) => setSubjects((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-5 text-sm">
        <div>
          <div className="mb-2 font-semibold">How do you want to learn?</div>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
            {([["", "Any"], ["ONLINE", "Online"], ["OFFLINE", "At home"]] as const).map(([v, l]) => (
              <button key={v} onClick={() => setMode(v)} className={`rounded-lg py-1.5 ${mode === v ? "bg-white font-medium shadow-sm" : "text-slate-600"}`}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 font-semibold">Subjects (pick all you need)</div>
          <div className="flex flex-wrap gap-1.5">
            {SUBJECTS.map((s) => (
              <button key={s} onClick={() => toggle(s)} className={`rounded-full border px-2.5 py-1 ${subjects.includes(s) ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 bg-white"}`}>{s}</button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="mb-1 block font-semibold">Class</span>
          <select value={level} onChange={(e) => setLevel(e.target.value as ClassLevel | "")} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2">
            <option value="">Any class</option>
            {CLASS_LEVELS.map((l) => <option key={l} value={l}>{CLASS_LEVEL_LABEL[l]}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-semibold">My area</span>
          <select value={area} onChange={(e) => setArea(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2">
            {Object.keys(DHAKA_AREAS).map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-semibold">Distance for home tutor: {km} km</span>
          <input type="range" min={1} max={15} value={km} onChange={(e) => setKm(Number(e.target.value))} className="w-full accent-brand-600" />
        </label>
        <label className="block">
          <span className="mb-1 block font-semibold">University</span>
          <select value={uni} onChange={(e) => setUni(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2">
            {UNIS.map((u) => <option key={u} value={u}>{u || "Any university"}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-semibold">Budget up to ৳{maxPrice.toLocaleString()}/month</span>
          <input type="range" min={1000} max={10000} step={500} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-brand-600" />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={trial} onChange={(e) => setTrial(e.target.checked)} className="accent-brand-600" /> Free trial available
        </label>
      </aside>
      <section>
        <div className="mb-4 h-72 overflow-hidden rounded-2xl border border-slate-200">
          <TutorMap center={center} teachers={hits.map((h) => h.teacher)} radiusKm={km} />
        </div>
        <p className="mb-3 text-sm text-slate-500">{hits.length} tutor{hits.length === 1 ? "" : "s"} found near {area}</p>
        <div className="space-y-3">
          {hits.map((h) => <TeacherCard key={h.teacher.id} t={h.teacher} distanceKm={h.distanceKm} />)}
          {hits.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">No tutors match. Try a wider distance or fewer subjects.</div>}
        </div>
      </section>
    </div>
  );
}
