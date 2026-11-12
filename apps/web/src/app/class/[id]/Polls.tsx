"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, type Participant, type RemoteParticipant } from "livekit-client";
import { copy } from "@/lib/copy";
import { L } from "@/lib/l10n";
import { useLang } from "@/lib/lang-client";

/**
 * Live polls over the LiveKit data channel (topic "mm-poll").
 * Tutor → everyone: start / end (+ optional results). Student → tutor only: answer.
 * Results live in the tutor's browser for now; saving them comes with the exam tables.
 */
const TOPIC = "mm-poll";

export type PollKind = "mcq" | "text";
export interface Poll { id: string; kind: PollKind; q: string; options: string[] }
export interface PollResults { id: string; counts: number[]; total: number }

type Msg =
  | { t: "start"; poll: Poll }
  | { t: "end"; id: string; results?: PollResults }
  | { t: "answer"; id: string; choice?: number; text?: string };

const enc = new TextEncoder();
const dec = new TextDecoder();
const isTeacher = (p?: Participant) => p?.attributes?.role === "teacher";

export function usePolls(role: "teacher" | "student") {
  const room = useRoomContext();
  const [active, setActive] = useState<Poll | null>(null);
  const [answers, setAnswers] = useState<Record<string, { name: string; choice?: number; text?: string }>>({});
  const [mine, setMine] = useState<{ id: string; choice?: number; text?: string } | null>(null);
  const [shown, setShown] = useState<{ poll: Poll; results: PollResults } | null>(null);
  const activeRef = useRef<Poll | null>(null);
  activeRef.current = active;

  const send = useCallback(
    (m: Msg, to?: string[]) => room.localParticipant.publishData(enc.encode(JSON.stringify(m)), { reliable: true, topic: TOPIC, destinationIdentities: to }),
    [room],
  );

  useEffect(() => {
    const onData = (payload: Uint8Array, from?: RemoteParticipant, _k?: unknown, topic?: string) => {
      if (topic !== TOPIC) return;
      let m: Msg;
      try { m = JSON.parse(dec.decode(payload)); } catch { return; }
      if (role === "teacher" && m.t === "answer" && from && activeRef.current?.id === m.id) {
        const text = typeof m.text === "string" ? m.text.slice(0, 500) : undefined;
        const choice = typeof m.choice === "number" ? m.choice : undefined;
        setAnswers((a) => ({ ...a, [from.identity]: { name: from.name || from.identity, choice, text } }));
      }
      if (role === "student" && isTeacher(from)) {
        if (m.t === "start") { setActive(m.poll); setShown(null); setMine(null); }
        if (m.t === "end") {
          const was = activeRef.current;
          setActive(null);
          if (m.results && was?.id === m.id) setShown({ poll: was, results: m.results });
        }
      }
    };
    // A student who joins mid-poll still gets the question.
    const onJoin = (p: RemoteParticipant) => {
      if (role === "teacher" && activeRef.current) send({ t: "start", poll: activeRef.current }, [p.identity]);
    };
    room.on(RoomEvent.DataReceived, onData);
    room.on(RoomEvent.ParticipantConnected, onJoin);
    return () => { room.off(RoomEvent.DataReceived, onData); room.off(RoomEvent.ParticipantConnected, onJoin); };
  }, [room, role, send]);

  const start = (poll: Omit<Poll, "id">) => {
    const p = { ...poll, id: Math.random().toString(36).slice(2, 10) };
    setActive(p); setAnswers({}); setShown(null);
    void send({ t: "start", poll: p });
  };
  const counts = (p: Poll) => {
    const c = p.options.map(() => 0);
    Object.values(answers).forEach((a) => { if (a.choice !== undefined && a.choice >= 0 && a.choice < c.length) c[a.choice]! += 1; });
    return c;
  };
  const end = (share: boolean) => {
    if (!active) return;
    const results = active.kind === "mcq" ? { id: active.id, counts: counts(active), total: Object.keys(answers).length } : undefined;
    void send({ t: "end", id: active.id, results: share ? results : undefined });
    if (share && results) setShown({ poll: active, results });
    setActive(null);
  };
  const answer = (a: { choice?: number; text?: string }) => {
    if (!active) return;
    const to = [...room.remoteParticipants.values()].filter(isTeacher).map((p) => p.identity);
    void send({ t: "answer", id: active.id, ...a }, to);
    setMine({ id: active.id, ...a });
  };

  return { active, answers, mine, shown, start, end, answer, counts, dismiss: () => setShown(null) };
}

type PollState = ReturnType<typeof usePolls>;
const box = "absolute inset-x-2 bottom-2 z-20 mx-auto max-w-md rounded-xl bg-chalk p-4 text-ink shadow-xl";

/** Tutor: compose a poll. */
export function PollComposer({ polls, onClose }: { polls: PollState; onClose: () => void }) {
  const lang = useLang();
  const c = copy(lang).room.poll;
  const [kind, setKind] = useState<PollKind>("mcq");
  const [q, setQ] = useState("");
  const [count, setCount] = useState(4);
  const [opts, setOpts] = useState<string[]>(["", "", "", "", ""]);
  return (
    <form
      className={box}
      onSubmit={(e) => {
        e.preventDefault();
        const options = kind === "mcq" ? opts.slice(0, count).map((o, i) => o.trim() || c.letters[i]!) : [];
        polls.start({ kind, q: q.trim() || c.defaultQ, options });
        onClose();
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{c.h}</h3>
        <div className="flex rounded-lg border border-line p-0.5 text-sm">
          {(["mcq", "text"] as const).map((k) => (
            <button type="button" key={k} onClick={() => setKind(k)} className={`rounded-md px-3 py-1 ${kind === k ? "bg-board text-white" : ""}`}>{k === "mcq" ? c.mcq : c.text}</button>
          ))}
        </div>
      </div>
      <textarea value={q} onChange={(e) => setQ(e.target.value)} placeholder={c.qPh} rows={2} className="field mt-3 w-full text-sm" />
      {kind === "mcq" && (
        <>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-ink-2">{c.options}</span>
            {[2, 3, 4, 5].map((k) => (
              <button type="button" key={k} onClick={() => setCount(k)} className={`h-8 w-8 rounded-md border ${count === k ? "border-board bg-board text-white" : "border-line"}`}>{L.num(k, lang)}</button>
            ))}
          </div>
          <div className="mt-2 grid gap-1.5">
            {opts.slice(0, count).map((o, i) => (
              <input key={i} value={o} onChange={(e) => setOpts((a) => a.map((x, j) => (j === i ? e.target.value : x)))} placeholder={c.optPh(c.letters[i]!)} className="field py-1.5! text-sm" />
            ))}
          </div>
        </>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-ghost text-sm">{c.cancel}</button>
        <button className="btn-board text-sm">{c.start}</button>
      </div>
    </form>
  );
}

function Bars({ options, counts, total, mine }: { options: string[]; counts: number[]; total: number; mine?: number }) {
  const lang = useLang();
  const c = copy(lang).room.poll;
  return (
    <div className="mt-3 grid gap-1.5">
      {options.map((o, i) => {
        const pct = total ? Math.round((100 * (counts[i] ?? 0)) / total) : 0;
        return (
          <div key={i} className="relative overflow-hidden rounded-md border border-line px-3 py-1.5 text-sm">
            <div className="absolute inset-y-0 left-0 bg-gold/50" style={{ width: `${pct}%` }} />
            <div className="relative flex justify-between gap-2">
              <span><b>{c.letters[i]}.</b> {o !== c.letters[i] ? o : ""}{mine === i ? ` · ${c.yours}` : ""}</span>
              <span className="tabular-nums">{L.num(counts[i] ?? 0, lang)} · {L.num(pct, lang)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Tutor: live tally of the running poll. */
export function PollLive({ polls, students }: { polls: PollState; students: number }) {
  const lang = useLang();
  const c = copy(lang).room.poll;
  const p = polls.active;
  if (!p) return null;
  const list = Object.values(polls.answers);
  return (
    <div className={box}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold"><span className="h-2 w-2 animate-pulse rounded-full bg-redpen" />{c.live}</span>
        <span className="text-xs text-ink-2">{c.answered(list.length, students)}</span>
      </div>
      <p className="mt-2 font-medium">{p.q}</p>
      {p.kind === "mcq" ? (
        <Bars options={p.options} counts={polls.counts(p)} total={list.length} />
      ) : (
        <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto text-sm">
          {list.length === 0 && <p className="text-ink-3">{c.noText}</p>}
          {list.map((a, i) => <p key={i}><b>{a.name}:</b> {a.text}</p>)}
        </div>
      )}
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button onClick={() => polls.end(false)} className="btn-ghost text-sm">{c.end}</button>
        {p.kind === "mcq" && <button onClick={() => polls.end(true)} className="btn-board text-sm">{c.share}</button>}
      </div>
    </div>
  );
}

/** Student: answer card, then results if the tutor shares them. */
export function PollAnswer({ polls }: { polls: PollState }) {
  const lang = useLang();
  const c = copy(lang).room.poll;
  const [text, setText] = useState("");
  const p = polls.active;
  if (polls.shown) {
    const { poll, results } = polls.shown;
    return (
      <div className={box}>
        <h3 className="font-semibold">{c.results}</h3>
        <p className="mt-1 text-sm">{poll.q}</p>
        <Bars options={poll.options} counts={results.counts} total={results.total} mine={polls.mine?.id === poll.id ? polls.mine.choice : undefined} />
        <div className="mt-3 text-right"><button onClick={polls.dismiss} className="btn-ghost text-sm">{c.close}</button></div>
      </div>
    );
  }
  if (!p) return null;
  const done = polls.mine?.id === p.id;
  return (
    <div className={box}>
      <h3 className="text-sm text-ink-2">{c.answerH}</h3>
      <p className="mt-1 font-medium">{p.q}</p>
      {done ? (
        <p className="mt-3 text-sm text-leaf">{c.thanks}</p>
      ) : p.kind === "mcq" ? (
        <div className={`mt-3 grid gap-2 ${p.options.length > 3 ? "grid-cols-2" : ""}`}>
          {p.options.map((o, i) => (
            <button key={i} onClick={() => polls.answer({ choice: i })} className="rounded-lg border border-line bg-white px-3 py-2 text-left text-sm hover:border-board">
              <b>{c.letters[i]}.</b> {o !== c.letters[i] ? o : ""}
            </button>
          ))}
        </div>
      ) : (
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) polls.answer({ text: text.trim().slice(0, 500) }); }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={c.answerPh} className="field min-w-0 flex-1 py-1.5! text-sm" />
          <button className="btn-board text-sm">{c.submit}</button>
        </form>
      )}
    </div>
  );
}
