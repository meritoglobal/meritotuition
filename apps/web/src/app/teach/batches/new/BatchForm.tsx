"use client";
import { useActionState, useState } from "react";
import { BATCH_SIZES, CLASS_LEVELS, SUBJECTS } from "@mastermoshai/core";
import { toolsCopy } from "@/lib/copy-tools";
import { L } from "@/lib/l10n";
import { useLang } from "@/lib/lang-client";
import { createBatch, type FormState } from "../../actions";

// BD week starts on Saturday; values are JS weekdays (Sun=0).
const WEEK = [6, 0, 1, 2, 3, 4, 5] as const;

export default function BatchForm() {
  const lang = useLang();
  const t = toolsCopy(lang).teach.batchForm;
  const [state, action, pending] = useActionState<FormState, FormData>(createBatch, null);
  const [slots, setSlots] = useState([{ k: 0 }]);
  return (
    <form action={action} className="max-w-2xl">
      <h1 className="font-display text-3xl">{t.h}</h1>
      <div className="card mt-6 grid gap-4 p-5">
        <label className="text-sm font-medium">{t.title}<input name="title" required placeholder={t.titlePh} className="field mt-1 w-full" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">{t.subject}
            <select name="subject" required className="field mt-1 w-full">{SUBJECTS.map((s) => <option key={s} value={s}>{L.subject(s, lang)}</option>)}</select>
          </label>
          <label className="text-sm font-medium">{t.level}
            <select name="level" required className="field mt-1 w-full">{CLASS_LEVELS.map((l) => <option key={l} value={l}>{L.level(l, lang)}</option>)}</select>
          </label>
          <label className="text-sm font-medium">{t.mode}
            <select name="mode" className="field mt-1 w-full">
              <option value="ONLINE">{toolsCopy(lang).teach.online}</option>
              <option value="OFFLINE">{toolsCopy(lang).teach.home}</option>
            </select>
          </label>
          <label className="text-sm font-medium">{t.capacity}
            <select name="capacity" defaultValue={3} className="field mt-1 w-full">{BATCH_SIZES.map((n) => <option key={n} value={n}>{L.num(n, lang)}</option>)}</select>
          </label>
          <label className="text-sm font-medium">{t.fee}<input name="fee" inputMode="numeric" placeholder="3000" className="field mt-1 w-full" /></label>
        </div>
        <fieldset>
          <legend className="text-sm font-medium">{t.schedule}</legend>
          <div className="mt-1 grid gap-2">
            {slots.map((s, i) => (
              <div key={s.k} className="flex flex-wrap items-center gap-2">
                <select name="day" aria-label={t.day} className="field py-1.5!">{WEEK.map((d) => <option key={d} value={d}>{L.day(d, lang)}</option>)}</select>
                <input name="time" type="time" required defaultValue="16:00" aria-label={t.time} className="field py-1.5!" />
                <input name="minutes" inputMode="numeric" defaultValue={60} aria-label={t.minutes} className="field w-20 py-1.5!" />
                <span className="text-sm text-ink-3">{t.minutes}</span>
                {slots.length > 1 && <button type="button" onClick={() => setSlots((a) => a.filter((_, j) => j !== i))} className="px-2 text-ink-3">✕</button>}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setSlots((a) => [...a, { k: Date.now() }])} className="mt-2 text-sm text-ink-2">{t.addSlot}</button>
        </fieldset>
        {state?.error && <p role="alert" className="text-sm text-redpen">{state.error === "bad" ? t.bad : toolsCopy(lang).error}</p>}
        <div><button disabled={pending} className="btn-board">{t.create}</button></div>
      </div>
    </form>
  );
}
