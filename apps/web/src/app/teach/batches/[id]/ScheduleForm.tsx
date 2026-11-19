"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { bizCopy } from "@/lib/copy-biz";
import { L } from "@/lib/l10n";
import { useLang } from "@/lib/lang-client";
import type { ChangeState } from "../../actions";

type Slot = { day: number; time: string; minutes: number };

export default function ScheduleForm({ action, schedule, upcoming }: { action: (s: ChangeState, f: FormData) => Promise<ChangeState>; schedule: Slot[]; upcoming: { iso: string; label: string; minutes: number }[] }) {
  const lang = useLang();
  const c = bizCopy(lang).routine;
  const [state, run, pending] = useActionState<ChangeState, FormData>(action, null);
  const [kind, setKind] = useState<"ROUTINE" | "RESCHEDULE">(upcoming.length ? "RESCHEDULE" : "ROUTINE");
  const [slots, setSlots] = useState<Slot[]>(schedule.length ? schedule : [{ day: 0, time: "17:00", minutes: 60 }]);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) form.current?.reset(); }, [state]);
  const err = state?.error === "past" ? c.past : state?.error ? c.bad : "";
  return (
    <form ref={form} action={run} className="card mt-6 space-y-3 p-5">
      <h2 className="font-semibold">{c.tH}</h2>
      <p className="text-sm text-ink-2">{c.tSub}</p>
      <input type="hidden" name="kind" value={kind} />
      <div className="flex gap-2">
        {(["RESCHEDULE", "ROUTINE"] as const).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${kind === k ? "border-board bg-board text-white" : "border-line"}`}>
            {k === "ROUTINE" ? c.kindRoutine : c.kindMove}
          </button>
        ))}
      </div>
      {kind === "ROUTINE" ? (
        <div className="space-y-2">
          {slots.map((s, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <label className="field"><span>{c.day}</span>
                <select name="day" value={s.day} onChange={(e) => setSlots(slots.map((x, j) => (j === i ? { ...x, day: Number(e.target.value) } : x)))}>
                  {[6, 0, 1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{L.day(d as 0, lang)}</option>)}
                </select>
              </label>
              <label className="field"><span>{c.time}</span><input name="time" type="time" value={s.time} required onChange={(e) => setSlots(slots.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))} /></label>
              <label className="field w-24"><span>{c.minutes}</span><input name="minutes" inputMode="numeric" value={s.minutes} onChange={(e) => setSlots(slots.map((x, j) => (j === i ? { ...x, minutes: Number(e.target.value.replace(/\D/g, "")) || 0 } : x)))} /></label>
              {slots.length > 1 && <button type="button" onClick={() => setSlots(slots.filter((_, j) => j !== i))} className="pb-2 text-sm text-redpen">{c.removeSlot}</button>}
            </div>
          ))}
          <button type="button" onClick={() => setSlots([...slots, { day: 2, time: "17:00", minutes: 60 }])} className="text-sm underline">{c.addSlot}</button>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="field"><span>{c.fromAt}</span>
            <select name="fromAt" required>{upcoming.map((u) => <option key={u.iso} value={u.iso}>{u.label}</option>)}</select>
          </label>
          <label className="field"><span>{c.toAt}</span><input name="toAt" type="datetime-local" required /></label>
          <input type="hidden" name="moveMinutes" value={upcoming[0]?.minutes ?? 60} />
        </div>
      )}
      <label className="field"><span>{c.note}</span><input name="note" maxLength={300} placeholder={c.notePh} /></label>
      {err && <p role="alert" className="text-sm text-redpen">{err}</p>}
      {state?.ok && <p role="status" className="text-sm text-leaf">{c.sent}</p>}
      <button disabled={pending} className="btn-board w-full">{c.send}</button>
    </form>
  );
}
