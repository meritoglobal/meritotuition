"use client";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { CLASS_LEVELS, DEMO_TEACHERS, DHAKA_AREAS, SUBJECTS, searchTeachers, type ClassLevel, type Subject, type TeachingMode } from "@mastermoshai/core";
import { TeacherCard } from "@/components/TeacherCard";
import { copy } from "@/lib/copy";
import { L } from "@/lib/l10n";
import { useLang } from "@/lib/lang-client";

const TutorMap = dynamic(() => import("@/components/TutorMap"), { ssr: false, loading: () => <div className="h-full bg-mist" /> });

const UNIS = ["", "BUET", "University of Dhaka", "North South University", "Jahangirnagar University"];

export default function SearchClient(init: { subjects?: string; level?: string; mode?: string; area?: string }) {
  const lang = useLang();
  const c = copy(lang).search;
  const [subjects, setSubjects] = useState<Subject[]>(init.subjects ? (init.subjects.split(",") as Subject[]) : []);
  const [level, setLevel] = useState<ClassLevel | "">((init.level as ClassLevel) ?? "");
  const [mode, setMode] = useState<TeachingMode | "">((init.mode as TeachingMode) ?? "");
  const [area, setArea] = useState(init.area && DHAKA_AREAS[init.area] ? init.area : "Farmgate");
  const [km, setKm] = useState(5);
  const [uni, setUni] = useState("");
  const [trial, setTrial] = useState(false);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [sort, setSort] = useState<"best" | "price" | "near">("best");

  const center = DHAKA_AREAS[area]!;
  const hits = useMemo(() => {
    const list = searchTeachers(DEMO_TEACHERS, {
      subjects,
      level: level || undefined,
      mode: mode || undefined,
      near: center,
      maxDistanceKm: km,
      university: uni || undefined,
      freeTrialOnly: trial,
      maxPrice,
    });
    if (sort === "price") list.sort((a, b) => a.teacher.fromPrice - b.teacher.fromPrice);
    if (sort === "near") list.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
    return list;
  }, [subjects, level, mode, center, km, uni, trial, maxPrice, sort]);

  const toggle = (s: Subject) => setSubjects((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  return (
    <>
      <div className="border-b-2 border-ink bg-sun">
        <div className="mx-auto max-w-7xl px-5 pb-6 pt-8">
          <h1 className="font-display text-4xl font-extrabold sm:text-5xl">
            {c.title(subjects.map((s) => L.subject(s, lang)).join(" + "), mode, L.area(area, lang))}
          </h1>
          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <label className="field">
              <span>{c.how}</span>
              <select value={mode} onChange={(e) => setMode(e.target.value as TeachingMode | "")}>
                <option value="">{c.anyHow}</option>
                <option value="ONLINE">{c.online}</option>
                <option value="OFFLINE">{c.offline}</option>
              </select>
            </label>
            <label className="field">
              <span>{c.level}</span>
              <select value={level} onChange={(e) => setLevel(e.target.value as ClassLevel | "")}>
                <option value="">{c.anyLevel}</option>
                {CLASS_LEVELS.map((l) => <option key={l} value={l}>{L.level(l, lang)}</option>)}
              </select>
            </label>
            <label className="field">
              <span>{c.area}</span>
              <select value={area} onChange={(e) => setArea(e.target.value)}>
                {Object.keys(DHAKA_AREAS).map((a) => <option key={a} value={a}>{L.area(a, lang)}</option>)}
              </select>
            </label>
            <label className="field">
              <span>{c.uni}</span>
              <select value={uni} onChange={(e) => setUni(e.target.value)}>
                {UNIS.map((u) => <option key={u} value={u}>{u ? L.uni(u, lang) : c.anyUni}</option>)}
              </select>
            </label>
            <label className="field">
              <span>{c.budget(L.taka(maxPrice, lang))}</span>
              <input type="range" min={1000} max={10000} step={500} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="accent-ink" />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {SUBJECTS.map((s) => (
              <button key={s} onClick={() => toggle(s)} className={`rounded-lg border-2 px-3 py-1.5 text-sm font-semibold ${subjects.includes(s) ? "border-ink bg-ink text-white" : "border-ink/20 bg-paper hover:border-ink"}`}>
                {L.subject(s, lang)}
              </button>
            ))}
            <label className="ml-auto flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={trial} onChange={(e) => setTrial(e.target.checked)} className="h-4 w-4 accent-ink" /> {c.trial}
            </label>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[1fr_380px]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <p className="font-semibold">{c.count(hits.length)}</p>
            <label className="field py-1!">
              <span>{c.sort}</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                <option value="best">{c.best}</option>
                <option value="price">{c.price}</option>
                <option value="near">{c.near}</option>
              </select>
            </label>
          </div>
          <div className="space-y-4">
            {hits.map((h, i) => <TeacherCard key={h.teacher.id} t={h.teacher} distanceKm={h.distanceKm} highlight={i === 0} lang={lang} />)}
            {hits.length === 0 && <div className="card p-10 text-center text-ink-2">{c.empty}</div>}
          </div>
        </section>
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card overflow-hidden p-0">
            <div className="h-80">
              <TutorMap center={center} teachers={hits.map((h) => h.teacher)} radiusKm={km} />
            </div>
            <div className="border-t-2 border-line p-4">
              <label className="block text-sm font-semibold">{c.distance(km, L.area(area, lang))}</label>
              <input type="range" min={1} max={15} value={km} onChange={(e) => setKm(Number(e.target.value))} className="mt-2 w-full accent-ink" />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
