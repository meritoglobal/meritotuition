"use client";
import { useActionState, useState } from "react";
import { CLASS_LEVELS, DHAKA_AREAS, SUBJECTS, UNIVERSITY_LABEL_BN } from "@mastermoshai/core";
import { toolsCopy } from "@/lib/copy-tools";
import { L } from "@/lib/l10n";
import { useLang } from "@/lib/lang-client";
import type { TeacherProfile } from "@/lib/batches";
import { saveProfile, type FormState } from "../actions";

export default function ProfileForm({ initial }: { initial: TeacherProfile | null }) {
  const lang = useLang();
  const t = toolsCopy(lang).teach.profile;
  const [state, action, pending] = useActionState<FormState, FormData>(saveProfile, null);
  const [home, setHome] = useState(initial?.teaches_home ?? false);
  const [online, setOnline] = useState(initial?.teaches_online ?? true);
  const p = initial;
  const chip = "flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1 text-sm has-[:checked]:border-board has-[:checked]:bg-board has-[:checked]:text-white";
  return (
    <form action={action} className="max-w-3xl">
      <h1 className="font-display text-3xl">{t.h}</h1>
      <p className="mt-1 text-sm text-ink-2">{t.sub}</p>
      <div className="card mt-6 grid gap-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">{t.name}<input name="name" required defaultValue={p?.name ?? ""} className="field mt-1 w-full" /></label>
          <label className="text-sm font-medium">{t.phone}<input name="phone" inputMode="tel" defaultValue={p?.phone ?? ""} placeholder="01XXXXXXXXX" className="field mt-1 w-full" /></label>
        </div>
        <label className="text-sm font-medium">{t.headline}<input name="headline" defaultValue={p?.headline ?? ""} placeholder={t.headlinePh} className="field mt-1 w-full" /></label>
        <label className="text-sm font-medium">{t.bio}<textarea name="bio" rows={5} defaultValue={p?.bio ?? ""} placeholder={t.bioPh} className="field mt-1 w-full" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">{t.uni}
            <input name="university" list="unis" defaultValue={p?.university ?? ""} className="field mt-1 w-full" />
            <datalist id="unis">{Object.keys(UNIVERSITY_LABEL_BN).map((u) => <option key={u} value={u}>{L.uni(u, lang)}</option>)}</datalist>
          </label>
          <label className="text-sm font-medium">{t.dept}<input name="department" defaultValue={p?.department ?? ""} className="field mt-1 w-full" /></label>
        </div>
        <fieldset>
          <legend className="text-sm font-medium">{t.subjects}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {SUBJECTS.map((s) => <label key={s} className={chip}><input type="checkbox" name="subjects" value={s} defaultChecked={p?.subjects.includes(s)} className="sr-only" />{L.subject(s, lang)}</label>)}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-medium">{t.levels}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {CLASS_LEVELS.map((l) => <label key={l} className={chip}><input type="checkbox" name="levels" value={l} defaultChecked={p?.levels.includes(l)} className="sr-only" />{L.level(l, lang)}</label>)}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="teaches_online" checked={online} onChange={(e) => setOnline(e.target.checked)} />{t.online}</label>
            {online && <label className="text-sm">{t.priceOnline}<input name="price_online" inputMode="numeric" defaultValue={p?.price_online ?? ""} className="field mt-1 w-full" /></label>}
          </div>
          <div className="grid gap-2">
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="teaches_home" checked={home} onChange={(e) => setHome(e.target.checked)} />{t.homeT}</label>
            {home && (
              <>
                <label className="text-sm">{t.area}
                  <select name="home_area" defaultValue={p?.home_area ?? ""} className="field mt-1 w-full">{Object.keys(DHAKA_AREAS).map((a) => <option key={a} value={a}>{L.area(a, lang)}</option>)}</select>
                </label>
                <label className="text-sm">{t.radius}<input name="home_radius_km" inputMode="numeric" defaultValue={p?.home_radius_km ?? 5} className="field mt-1 w-full" /></label>
                <label className="text-sm">{t.priceHome}<input name="price_home" inputMode="numeric" defaultValue={p?.price_home ?? ""} className="field mt-1 w-full" /></label>
              </>
            )}
          </div>
        </div>
        {state?.error && <p role="alert" className="text-sm text-redpen">{state.error === "bad" ? t.bad : toolsCopy(lang).error}</p>}
        <div className="flex items-center gap-3">
          <button disabled={pending} className="btn-board">{t.save}</button>
          {state?.ok && <span className="text-sm text-leaf">{t.saved}</span>}
        </div>
      </div>
    </form>
  );
}
