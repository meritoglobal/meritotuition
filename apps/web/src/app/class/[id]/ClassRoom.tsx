"use client";
import { useEffect, useState } from "react";
import { roomState, type ClassRoomState } from "@merito/core";

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
      <div className="flex h-[70vh] flex-col overflow-hidden rounded-3xl bg-slate-900 text-white">
        <div className="flex items-center justify-between px-5 py-3 text-sm">
          <span className="font-medium">{title}</span>
          <span className="flex items-center gap-2 text-red-400"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> Live</span>
        </div>
        <div className="grid flex-1 gap-2 p-2 sm:grid-cols-[2fr_1fr]">
          <div className="flex items-center justify-center rounded-2xl bg-slate-800 text-lg">{teacher} · sharing whiteboard</div>
          <div className="grid gap-2">
            <div className="flex items-center justify-center rounded-2xl bg-slate-800">You</div>
            <div className="flex items-center justify-center rounded-2xl bg-slate-800 text-slate-400">Classmate</div>
          </div>
        </div>
        <div className="flex justify-center gap-3 p-4">
          {["Mic", "Camera", "Share screen", "Raise hand", "Chat"].map((c) => (
            <button key={c} className="rounded-full bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600">{c}</button>
          ))}
          <button onClick={() => setEnded(true)} className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold">Leave</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
      <div className="text-sm text-slate-500">{title}</div>
      <h1 className="mt-1 text-2xl font-bold">{teacher}</h1>
      {state === "ENDED" ? (
        <div className="mt-6">
          <p className="text-lg font-medium">Class ended</p>
          <p className="mt-1 text-sm text-slate-500">How was it? If something went wrong you can flag this class within 48 hours.</p>
          <div className="mt-4 flex justify-center gap-2">
            <a href="/dashboard/student" className="rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white">Rate class</a>
            <a href="/dashboard/student#flag" className="rounded-full border border-red-300 px-5 py-2 text-sm font-semibold text-red-700">Flag a problem</a>
          </div>
        </div>
      ) : (
        <>
          <div className="mx-auto mt-8 flex h-40 w-40 flex-col items-center justify-center rounded-full border-8 border-brand-100">
            {state === "LIVE" ? (
              <span className="text-lg font-semibold text-brand-700">Live now</span>
            ) : state === "WAITING_FOR_TEACHER" ? (
              <span className="px-4 text-sm font-medium text-amber-700">Waiting for the teacher</span>
            ) : (
              <>
                <span className="text-xs text-slate-500">starts in</span>
                <span className="text-3xl font-bold tabular-nums">{mmss}</span>
              </>
            )}
          </div>
          <p className="mt-6 text-sm text-slate-500">
            {state === "LIVE"
              ? "The teacher has started. Join now."
              : role === "teacher"
                ? "Start the class when you are ready. All your students get a notification."
                : "You are in the waiting room. We will notify you the moment the teacher starts."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {role === "teacher" && !teacherStarted && (
              <button onClick={() => { setTeacherStarted(true); setJoined(true); }} className="rounded-full bg-brand-600 px-6 py-3 font-semibold text-white">Start class</button>
            )}
            {role === "student" && (
              <button disabled={state !== "LIVE"} onClick={() => setJoined(true)} className="rounded-full bg-brand-600 px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">Join class</button>
            )}
          </div>
          {role === "student" && !teacherStarted && (
            <button onClick={() => setTeacherStarted(true)} className="mt-6 text-xs text-slate-400 underline">Demo: simulate the teacher starting</button>
          )}
          <p className="mt-6 text-xs text-slate-400">Your attendance is recorded automatically. If the teacher does not join within 15 minutes, this class is refunded.</p>
        </>
      )}
    </div>
  );
}
