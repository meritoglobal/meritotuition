"use client";
import { useEffect, useState } from "react";
import { roomState, type ClassRoomState } from "@mastermoshai/core";
import { copy } from "@/lib/copy";
import { L } from "@/lib/l10n";
import { useLang } from "@/lib/lang-client";

/**
 * Live class panel. Production: fetch GET /sessions/:id/room for state, then
 * POST /sessions/:id/join for a LiveKit token and render @livekit/components-react
 * <LiveKitRoom> in place of the demo tiles below.
 */
export default function ClassRoom({ title, teacher, role }: { title: string; teacher: string; role: "student" | "teacher" }) {
  const lang = useLang();
  const c = copy(lang).room;
  const [start] = useState(() => new Date(Date.now() + 90_000));
  const [now, setNow] = useState(() => new Date());
  const [teacherStarted, setTeacherStarted] = useState(false);
  const [joined, setJoined] = useState(false);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const state: ClassRoomState = roomState({ now, start, durationMin: 60, teacherStarted, ended });
  const secs = Math.max(0, Math.round((start.getTime() - now.getTime()) / 1000));
  const mmss = L.num(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`, lang);

  if (joined && state === "LIVE") {
    return (
      <div className="flex h-[70vh] flex-col overflow-hidden rounded-xl bg-board text-white">
        <div className="flex items-center justify-between px-5 py-3 text-sm">
          <span className="font-medium">{title}</span>
          <span className="flex items-center gap-2 text-white"><span className="h-2 w-2 animate-pulse rounded-full bg-redpen" /> {c.live}</span>
        </div>
        <div className="grid flex-1 gap-2 p-2 sm:grid-cols-[2fr_1fr]">
          <div className="flex items-center justify-center rounded-lg bg-white/10 text-lg">{teacher} · {c.board}</div>
          <div className="grid gap-2">
            <div className="flex items-center justify-center rounded-lg bg-white/10">{c.you}</div>
            <div className="flex items-center justify-center rounded-lg bg-white/10 text-ink-3">{c.mate}</div>
          </div>
        </div>
        <div className="flex justify-center gap-3 p-4">
          {c.controls.map((x) => (
            <button key={x} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">{x}</button>
          ))}
          <button onClick={() => setEnded(true)} className="rounded-lg bg-redpen px-4 py-2 text-sm font-semibold text-white">{c.leave}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-8 text-center">
      <div className="text-sm text-ink-2">{title}</div>
      <h1 className="mt-1 font-display text-4xl">{teacher}</h1>
      {state === "ENDED" ? (
        <div className="mt-6">
          <p className="text-lg font-medium">{c.ended}</p>
          <p className="mt-1 text-sm text-ink-2">{c.endedSub}</p>
          <div className="mt-4 flex justify-center gap-2">
            <a href="/dashboard/student" className="btn-ink">{c.rate}</a>
            <a href="/dashboard/student#flag" className="btn-ghost text-redpen!">{c.flag}</a>
          </div>
        </div>
      ) : (
        <>
          <div className="mx-auto mt-8 flex h-44 w-44 flex-col items-center justify-center rounded-full border-[6px] border-chalk-2 bg-paper">
            {state === "LIVE" ? (
              <span className="text-2xl font-bold text-leaf">{c.liveNow}</span>
            ) : state === "WAITING_FOR_TEACHER" ? (
              <span className="px-4 text-sm font-medium text-ink">{c.waiting}</span>
            ) : (
              <>
                <span className="text-xs text-ink-2">{c.startsIn}</span>
                <span className="text-3xl font-bold tabular-nums">{mmss}</span>
              </>
            )}
          </div>
          <p className="mt-6 text-sm text-ink-2">
            {state === "LIVE"
              ? c.msgLive
              : role === "teacher"
                ? c.msgTeacher
                : c.msgStudent}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {role === "teacher" && !teacherStarted && (
              <button onClick={() => { setTeacherStarted(true); setJoined(true); }} className="btn-gold">{c.start}</button>
            )}
            {role === "student" && (
              <button disabled={state !== "LIVE"} onClick={() => setJoined(true)} className="btn-board disabled:cursor-not-allowed disabled:border-line disabled:bg-mist disabled:text-ink-3">{c.join}</button>
            )}
          </div>
          {role === "student" && !teacherStarted && (
            <button onClick={() => setTeacherStarted(true)} className="mt-6 text-xs text-ink-3 underline">{c.demo}</button>
          )}
          <p className="mt-6 text-xs text-ink-3">{c.note}</p>
        </>
      )}
    </div>
  );
}
