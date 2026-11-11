"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CLASS_LEVELS, DEMO_TEACHERS, DHAKA_AREAS, SUBJECTS, TIMES_OF_DAY, searchTeachers,
  type BatchKind, type ClassLevel, type Subject, type TeacherHit, type TimeOfDay,
} from "@mastermoshai/core";
import { TeacherCard } from "@/components/TeacherCard";
import { copy } from "@/lib/copy";
import { L } from "@/lib/l10n";
import { useLang } from "@/lib/lang-client";

const TutorMap = dynamic(() => import("@/components/TutorMap"), { ssr: false, loading: () => <div className="h-full bg-mist" /> });

const UNIS = ["", "BUET", "University of Dhaka", "North South University", "Jahangirnagar University"];
type Sort = "best" | "price" | "near";

export interface SearchInit { subjects?: string; level?: string; area?: string; time?: string; batch?: string }

function useCommon(init: SearchInit) {
  const [subjects, setSubjects] = useState<Subject[]>(init.subjects ? (init.subjects.split(",").filter((s) => (SUBJECTS as readonly string[]).includes(s)) as Subject[]) : []);
  const [level, setLevel] = useState<ClassLevel | "">(CLASS_LEVELS.includes(init.level as ClassLevel) ? (init.level as ClassLevel) : "");
  const [uni, setUni] = useState("");
  const [trial, setTrial] = useState(false);
  const [maxPrice, setMaxPrice] = useState(10000);
  const toggle = (s: Subject) => setSubjects((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  return { subjects, toggle, level, setLevel, uni, setUni, trial, setTrial, maxPrice, setMaxPrice };
}

function sortHits(list: TeacherHit[], sort: Sort) {
  if (sort === "price") return [...list].sort((a, b) => a.fromPrice - b.fromPrice);
  if (sort === "near") return [...list].sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
  return list;
}

/* ---------- ONLINE: no area, no map. Time of day and class size instead. ---------- */
export function OnlineSearch(init: SearchInit) {
  const lang = useLang();
  const c = copy(lang).search;
  const f = useCommon(init);
  const [time, setTime] = useState<TimeOfDay | "">(TIMES_OF_DAY.includes(init.time as TimeOfDay) ? (init.time as TimeOfDay) : "");
  const [batch, setBatch] = useState<BatchKind | "">(init.batch === "ONE" || init.batch === "GROUP" ? init.batch : "");
  const [sort, setSort] = useState<Sort>("best");

  const hits = useMemo(
    () => sortHits(searchTeachers(DEMO_TEACHERS, { mode: "ONLINE", subjects: f.subjects, level: f.level || undefined, university: f.uni || undefined, freeTrialOnly: f.trial, maxPrice: f.maxPrice, timeOfDay: time || undefined, batchKind: batch || undefined }), sort),
    [f.subjects, f.level, f.uni, f.trial, f.maxPrice, time, batch, sort],
  );

  return (
    <>
      <Header title={c.onlineTitle(f.subjects.map((s) => L.subject(s, lang)).join(" + "))} sub={c.onlineSub} switchHref="/teachers/home" switchLabel={c.toHome}>
        <div className="grid gap-2 text-ink sm:grid-cols-2 lg:grid-cols-5">
          <label className="field">
            <span>{c.when}</span>
            <select value={time} onChange={(e) => setTime(e.target.value as TimeOfDay | "")}>
              <option value="">{c.anyTime}</option>
              {TIMES_OF_DAY.map((t) => <option key={t} value={t}>{c.times[t]}</option>)}
            </select>
          </label>
          <label className="field">
            <span>{c.batch}</span>
            <select value={batch} onChange={(e) => setBatch(e.target.value as BatchKind | "")}>
              <option value="">{c.anyBatch}</option>
              <option value="ONE">{c.one}</option>
              <option value="GROUP">{c.group}</option>
            </select>
          </label>
          <LevelField f={f} />
          <UniField f={f} />
          <BudgetField f={f} />
        </div>
        <Chips f={f} />
      </Header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[1fr_320px]">
        <Results hits={hits} mode="ONLINE" sort={sort} setSort={setSort} />
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card bg-online p-6">
            <div className="font-bold text-online-ink">{c.onlinePanel.h}</div>
            <ol className="mt-4 space-y-3 text-[15px] text-ink-2">
              {c.onlinePanel.items.map((x, i) => (
                <li key={x} className="grid grid-cols-[1.75rem_1fr] gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-paper text-xs font-bold text-online-ink">{L.num(i + 1, lang)}</span>
                  {x}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </>
  );
}

/* ---------- HOME: area first, distance and map. ---------- */
export function HomeSearch(init: SearchInit) {
  const lang = useLang();
  const c = copy(lang).search;
  const f = useCommon(init);
  const [area, setArea] = useState(init.area && DHAKA_AREAS[init.area] ? init.area : "Farmgate");
  const [km, setKm] = useState(5);
  const [sort, setSort] = useState<Sort>("near");
  const center = DHAKA_AREAS[area]!;

  const hits = useMemo(
    () => sortHits(searchTeachers(DEMO_TEACHERS, { mode: "OFFLINE", near: center, maxDistanceKm: km, subjects: f.subjects, level: f.level || undefined, university: f.uni || undefined, freeTrialOnly: f.trial, maxPrice: f.maxPrice }), sort),
    [center, km, f.subjects, f.level, f.uni, f.trial, f.maxPrice, sort],
  );

  return (
    <>
      <Header title={c.homeTitle(L.area(area, lang))} sub={c.homeSub} switchHref="/teachers/online" switchLabel={c.toOnline}>
        <div className="grid gap-2 text-ink sm:grid-cols-2 lg:grid-cols-4">
          <label className="field">
            <span>{c.area}</span>
            <select value={area} onChange={(e) => setArea(e.target.value)}>
              {Object.keys(DHAKA_AREAS).map((a) => <option key={a} value={a}>{L.area(a, lang)}</option>)}
            </select>
          </label>
          <LevelField f={f} />
          <UniField f={f} />
          <BudgetField f={f} />
        </div>
        <Chips f={f} />
      </Header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[1fr_380px]">
        <Results hits={hits} mode="OFFLINE" sort={sort} setSort={setSort} />
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card overflow-hidden p-0">
            <div className="h-80">
              <TutorMap center={center} teachers={hits.map((h) => h.teacher)} radiusKm={km} />
            </div>
            <div className="border-t border-line p-4">
              <label className="block text-sm font-semibold">{c.distance(km, L.area(area, lang))}</label>
              <input type="range" min={1} max={15} value={km} onChange={(e) => setKm(Number(e.target.value))} className="mt-2 w-full accent-board" />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

/* ---------- shared pieces ---------- */
type F = ReturnType<typeof useCommon>;

function Header({ title, sub, switchHref, switchLabel, children }: { title: string; sub: string; switchHref: string; switchLabel: string; children: React.ReactNode }) {
  return (
    <div className="bg-board text-white">
      <div className="mx-auto max-w-7xl px-5 pb-6 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl">{title}</h1>
            <p className="mt-2 text-white/70">{sub}</p>
          </div>
          <Link href={switchHref} className="text-sm font-semibold text-gold underline-offset-4 hover:underline">{switchLabel}</Link>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

function LevelField({ f }: { f: F }) {
  const lang = useLang();
  const c = copy(lang).search;
  return (
    <label className="field">
      <span>{c.level}</span>
      <select value={f.level} onChange={(e) => f.setLevel(e.target.value as ClassLevel | "")}>
        <option value="">{c.anyLevel}</option>
        {CLASS_LEVELS.map((l) => <option key={l} value={l}>{L.level(l, lang)}</option>)}
      </select>
    </label>
  );
}

function UniField({ f }: { f: F }) {
  const lang = useLang();
  const c = copy(lang).search;
  return (
    <label className="field">
      <span>{c.uni}</span>
      <select value={f.uni} onChange={(e) => f.setUni(e.target.value)}>
        {UNIS.map((u) => <option key={u} value={u}>{u ? L.uni(u, lang) : c.anyUni}</option>)}
      </select>
    </label>
  );
}

function BudgetField({ f }: { f: F }) {
  const lang = useLang();
  const c = copy(lang).search;
  return (
    <label className="field">
      <span>{c.budget(L.taka(f.maxPrice, lang))}</span>
      <input type="range" min={1000} max={10000} step={500} value={f.maxPrice} onChange={(e) => f.setMaxPrice(Number(e.target.value))} className="accent-board" />
    </label>
  );
}

function Chips({ f }: { f: F }) {
  const lang = useLang();
  const c = copy(lang).search;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {SUBJECTS.map((s) => (
        <button key={s} onClick={() => f.toggle(s)} className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${f.subjects.includes(s) ? "border-gold bg-gold text-ink" : "border-board-line text-white/85 hover:border-white/60"}`}>
          {L.subject(s, lang)}
        </button>
      ))}
      <label className="ml-auto flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={f.trial} onChange={(e) => f.setTrial(e.target.checked)} className="h-4 w-4 accent-gold" /> {c.trial}
      </label>
    </div>
  );
}

function Results({ hits, mode, sort, setSort }: { hits: TeacherHit[]; mode: "ONLINE" | "OFFLINE"; sort: Sort; setSort: (s: Sort) => void }) {
  const lang = useLang();
  const c = copy(lang).search;
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <p className="font-semibold">{c.count(hits.length)}</p>
        <label className="field py-1!">
          <span>{c.sort}</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="best">{c.best}</option>
            <option value="price">{c.price}</option>
            {mode === "OFFLINE" && <option value="near">{c.near}</option>}
          </select>
        </label>
      </div>
      <div className="space-y-4">
        {hits.map((h, i) => <TeacherCard key={h.teacher.id} t={h.teacher} mode={mode} hit={h} highlight={i === 0} lang={lang} />)}
        {hits.length === 0 && <div className="card p-10 text-center text-ink-2">{c.empty}</div>}
      </div>
    </section>
  );
}
