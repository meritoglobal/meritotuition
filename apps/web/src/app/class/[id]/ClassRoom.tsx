"use client";
import { useEffect, useState } from "react";
import { roomState, type ClassRoomState } from "@mastermoshai/core";

/**
 * Live class panel. Production: fetch GET /sessions/:id/room for state, then
 * POST /sessions/:id/join for a LiveKit token and render @livekit/components-react
 * <LiveKitRoom> in place of the demo tiles below.
 */
export default function ClassRoom({ title, teacher, role }: { title: string; teacher: string; role: "student" | "teacher" }) {
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
  const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

  if (joined && state === "LIVE") {
    return (
      <div className="flex h-[70vh] flex-col overflow-hidden rounded-xl border-2 border-ink bg-ink text-white">
        <div className="flex items-center justify-between px-5 py-3 text-sm">
          <span className="font-medium">{title}</span>
          <span className="flex items-center gap-2 text-coral"><span className="h-2 w-2 animate-pulse rounded-full bg-coral" /> Live</span>
        </div>
        <div className="grid flex-1 gap-2 p-2 sm:grid-cols-[2fr_1fr]">
          <div className="flex items-center justify-center rounded-lg bg-white/10 text-lg">{teacher} · sharing whiteboard</div>
          <div className="grid gap-2">
            <div className="flex items-center justify-center rounded-lg bg-white/10">You</div>
            <div className="flex items-center justify-center rounded-lg bg-white/10 text-ink-3">Classmate</div>
          </div>
        </div>
        <div className="flex justify-center gap-3 p-4">
          {["Mic", "Camera", "Share screen", "Raise hand", "Chat"].map((c) => (
            <button key={c} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">{c}</button>
          ))}
          <button onClick={() => setEnded(true)} className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-ink">Leave</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-8 text-center">
      <div className="text-sm text-ink-2">{title}</div>
      <h1 className="mt-1 font-display text-4xl font-extrabold">{teacher}</h1>
      {state === "ENDED" ? (
        <div className="mt-6">
          <p className="text-lg font-medium">Class ended</p>
          <p className="mt-1 text-sm text-ink-2">How was it? If something went wrong you can flag this class within 48 hours.</p>
          <div className="mt-4 flex justify-center gap-2">
            <a href="/dashboard/student" className="btn-ink">Rate class</a>
            <a href="/dashboard/student#flag" className="btn-ghost text-coral!">Flag a problem</a>
          </div>
        </div>
      ) : (
        <>
          <div className="mx-auto mt-8 flex h-44 w-44 flex-col items-center justify-center rounded-full border-4 border-ink bg-sun">
            {state === "LIVE" ? (
              <span className="font-display text-2xl font-extrabold text-leaf">Live now</span>
            ) : state === "WAITING_FOR_TEACHER" ? (
              <span className="px-4 text-sm font-medium text-ink">Waiting for the teacher</span>
            ) : (
              <>
                <span className="text-xs text-ink-2">starts in</span>
                <span className="text-3xl font-bold tabular-nums">{mmss}</span>
              </>
            )}
          </div>
          <p className="mt-6 text-sm text-ink-2">
            {state === "LIVE"
              ? "The teacher has started. Join now."
              : role === "teacher"
                ? "Start the class when you are ready. All your students get a notification."
                : "You are in the waiting room. We will notify you the moment the teacher starts."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {role === "teacher" && !teacherStarted && (
              <button onClick={() => { setTeacherStarted(true); setJoined(true); }} className="btn-sun">Start class</button>
            )}
            {role === "student" && (
              <button disabled={state !== "LIVE"} onClick={() => setJoined(true)} className="btn-ink disabled:cursor-not-allowed disabled:border-line disabled:bg-mist disabled:text-ink-3">Join class</button>
            )}
          </div>
          {role === "student" && !teacherStarted && (
            <button onClick={() => setTeacherStarted(true)} className="mt-6 text-xs text-ink-3 underline">Demo: simulate the teacher starting</button>
          )}
          <p className="mt-6 text-xs text-ink-3">Your attendance is recorded automatically. If the teacher does not join within 15 minutes, this class is refunded.</p>
        </>
      )}
    </div>
  );
}
