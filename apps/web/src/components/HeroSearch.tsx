"use client";
import { useState } from "react";
import { CLASS_LEVELS, DHAKA_AREAS, SUBJECTS, TIMES_OF_DAY } from "@mastermoshai/core";
import { copy } from "@/lib/copy";
import { L } from "@/lib/l10n";
import { useLang } from "@/lib/lang-client";

/** Home-page search: pick online or home first, because they ask different questions. */
export function HeroSearch() {
  const lang = useLang();
  const all = copy(lang);
  const c = all.home.form;
  const s = all.search;
  const [mode, setMode] = useState<"online" | "home">("online");
  return (
    <div>
      <div className="flex gap-1" role="tablist">
        {(["online", "home"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-t-lg px-5 py-2.5 text-[15px] font-semibold transition-colors ${mode === m ? "bg-paper text-ink" : "text-white/70 hover:text-white"}`}
          >
            {m === "online" ? c.tabOnline : c.tabHome}
          </button>
        ))}
      </div>
      <form action={`/teachers/${mode}`} className="grid gap-1 rounded-xl rounded-tl-none bg-paper p-1.5 text-ink md:grid-cols-[1fr_1fr_1fr_auto]">
        <label className="field border-transparent!">
          <span>{c.subject}</span>
          <select name="subjects" defaultValue="">
            <option value="">{c.anySubject}</option>
            {SUBJECTS.map((x) => <option key={x} value={x}>{L.subject(x, lang)}</option>)}
          </select>
        </label>
        <label className="field border-transparent!">
          <span>{c.level}</span>
          <select name="level" defaultValue="">
            <option value="">{c.anyLevel}</option>
            {CLASS_LEVELS.map((l) => <option key={l} value={l}>{L.level(l, lang)}</option>)}
          </select>
        </label>
        {mode === "online" ? (
          <label className="field border-transparent!">
            <span>{s.when}</span>
            <select name="time" defaultValue="">
              <option value="">{s.anyTime}</option>
              {TIMES_OF_DAY.map((t) => <option key={t} value={t}>{s.times[t]}</option>)}
            </select>
          </label>
        ) : (
          <label className="field border-transparent!">
            <span>{c.area}</span>
            <select name="area" defaultValue="Farmgate">
              {Object.keys(DHAKA_AREAS).map((x) => <option key={x} value={x}>{L.area(x, lang)}</option>)}
            </select>
          </label>
        )}
        <button className="btn-gold text-base">{c.submit}</button>
      </form>
    </div>
  );
}
