"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ExamQuestion } from "@mastermoshai/core";
import { copy } from "@/lib/copy";
import { toolsCopy } from "@/lib/copy-tools";
import { L } from "@/lib/l10n";
import { useLang } from "@/lib/lang-client";
import { Note, asQ, useApi } from "./ClassTools";

type Role = "teacher" | "student";
interface Exam { id: string; classId: string; title: string; instructions: string | null; durationMin: number | null; maxMarks: number; published: boolean; questions: ExamQuestion[] }
interface Submission { id?: string; student_name?: string; answers: Record<string, number | string>; auto_score: number; manual: Record<string, number>; total: number; checked: boolean; submitted_at: string }

export default function ExamView({ examId, role }: { examId: string; role: Role }) {
  const lang = useLang();
  const t = toolsCopy(lang);
  const { data, state, reload } = useApi<{ exam: Exam; submission?: Submission | null }>(`/api/exams/${encodeURIComponent(examId)}${asQ(role)}`);
  if (state === "off") return <Note>{t.off}</Note>;
  if (state === "error") return <Note>{t.error}</Note>;
  if (state === "loading" || !data) return <Note>{t.loading}</Note>;
  const e = data.exam;
  return (
    <div>
      <Link href={`/class/${encodeURIComponent(e.classId)}${asQ(role)}${asQ(role) ? "&" : "?"}tab=exams`} className="text-sm text-ink-2">{t.builder.back}</Link>
      <h1 className="mt-2 font-display text-3xl">{e.title}</h1>
      <p className="mt-1 text-sm text-ink-3">{t.exams.meta(e.questions.length, e.maxMarks, e.durationMin)}</p>
      {e.instructions && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-mist p-3 text-sm">{e.instructions}</p>}
      {role === "teacher" ? <Grade exam={e} /> : data.submission ? <Result exam={e} sub={data.submission} /> : <Take exam={e} onDone={reload} />}
    </div>
  );
}

function Prompt({ q, i }: { q: ExamQuestion; i: number }) {
  const lang = useLang();
  return (
    <div className="flex justify-between gap-3">
      <p className="whitespace-pre-wrap font-medium">{L.num(i + 1, lang)}. {q.prompt}</p>
      <span className="shrink-0 text-xs text-ink-3">[{L.num(q.marks, lang)}]</span>
    </div>
  );
}

/** Student: answer and hand in. Auto-submits when the timer runs out. */
function Take({ exam, onDone }: { exam: Exam; onDone: () => void }) {
  const lang = useLang();
  const t = toolsCopy(lang).take;
  const letters = copy(lang).room.poll.letters;
  const key = `mm_exam_${exam.id}`;
  const [answers, setAnswers] = useState<Record<string, number | string>>(() => {
    try { return JSON.parse(localStorage.getItem(key) ?? "{}").answers ?? {}; } catch { return {}; }
  });
  const [deadline] = useState<number | null>(() => {
    if (!exam.durationMin) return null;
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "{}").deadline;
      if (typeof saved === "number") return saved;
    } catch { /* first visit */ }
    return Date.now() + exam.durationMin * 60_000;
  });
  const [now, setNow] = useState(() => Date.now());
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const sent = useRef(false);

  useEffect(() => { try { localStorage.setItem(key, JSON.stringify({ answers, deadline })); } catch { /* private mode */ } }, [answers, deadline, key]);
  useEffect(() => { if (!deadline) return; const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, [deadline]);

  async function submit(auto = false) {
    if (sent.current) return;
    sent.current = true; setBusy(true);
    const r = await fetch(`/api/exams/${exam.id}/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers }) });
    setBusy(false);
    if (r.ok || r.status === 409) {
      try { localStorage.removeItem(key); } catch { /* ignore */ }
      if (auto) setMsg(t.timeUp);
      onDone();
    } else {
      sent.current = false;
      setMsg(toolsCopy(lang).error);
    }
  }

  const left = deadline ? Math.max(0, Math.round((deadline - now) / 1000)) : null;
  useEffect(() => { if (left === 0) void submit(true); }); // eslint-disable-line react-hooks/exhaustive-deps
  const answered = exam.questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== "").length;

  return (
    <div className="mt-6">
      {left !== null && (
        <div className={`sticky top-2 z-10 mb-4 ml-auto w-fit rounded-lg px-3 py-1.5 text-sm font-semibold tabular-nums shadow ${left < 60 ? "bg-redpen text-white" : "bg-gold text-board"}`}>
          {t.left} {L.num(`${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`, lang)}
        </div>
      )}
      <ol className="space-y-4">
        {exam.questions.map((q, i) => (
          <li key={q.id} className="card p-5">
            <Prompt q={q} i={i} />
            {q.kind === "mcq" ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {q.options?.map((o, k) => (
                  <label key={k} className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${answers[q.id] === k ? "border-board bg-board/5" : "border-line"}`}>
                    <input type="radio" name={q.id} checked={answers[q.id] === k} onChange={() => setAnswers((a) => ({ ...a, [q.id]: k }))} className="mt-0.5 accent-[var(--color-board)]" />
                    <span><b>{letters[k]}.</b> {o}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea value={(answers[q.id] as string) ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} placeholder={t.writePh} rows={6} className="field mt-3 w-full" />
            )}
          </li>
        ))}
      </ol>
      <div className="mt-6 rounded-xl border border-line p-4">
        {confirm ? (
          <>
            <p className="text-sm">{t.confirm(answered, exam.questions.length)}</p>
            <div className="mt-3 flex gap-2">
              <button disabled={busy} onClick={() => submit()} className="btn-board text-sm">{busy ? t.submitting : t.sure}</button>
              <button onClick={() => setConfirm(false)} className="btn-ghost text-sm">{t.wait}</button>
            </div>
          </>
        ) : (
          <button onClick={() => setConfirm(true)} className="btn-gold">{t.submit}</button>
        )}
        {msg && <p role="alert" className="mt-2 text-sm text-redpen">{msg}</p>}
      </div>
    </div>
  );
}

/** Student: score, and each question with their answer (and the MCQ key). */
function Result({ exam, sub }: { exam: Exam; sub: Submission }) {
  const lang = useLang();
  const t = toolsCopy(lang).take;
  const letters = copy(lang).room.poll.letters;
  return (
    <div className="mt-6">
      <div className="card bg-board p-5 text-white">
        <p className="font-semibold">{t.done}</p>
        <p className="mt-1 text-2xl font-bold">{sub.checked ? t.final(Number(sub.total), exam.maxMarks) : t.mcqScore(Number(sub.auto_score))}</p>
        {!sub.checked && <p className="mt-1 text-sm text-white/80">{t.waitWritten}</p>}
      </div>
      <ol className="mt-4 space-y-3">
        {exam.questions.map((q, i) => {
          const a = sub.answers[q.id];
          const right = q.kind === "mcq" && a === q.answer;
          const got = q.kind === "mcq" ? (right ? q.marks : 0) : sub.manual[q.id];
          return (
            <li key={q.id} className="card p-4 text-sm">
              <Prompt q={q} i={i} />
              {q.kind === "mcq" ? (
                <p className="mt-2">
                  {t.yours}: <b className={right ? "text-leaf" : "text-redpen"}>{typeof a === "number" ? `${letters[a]}. ${q.options?.[a] ?? ""}` : t.noAnswer}</b>
                  {!right && typeof q.answer === "number" && <> · {t.right}: <b className="text-leaf">{letters[q.answer]}. {q.options?.[q.answer]}</b></>}
                </p>
              ) : (
                <p className="mt-2 whitespace-pre-wrap rounded bg-mist p-2">{(a as string) || t.noAnswer}</p>
              )}
              {got !== undefined && <p className="mt-1 text-right text-xs font-semibold">{t.marksGot(got, q.marks)}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Tutor: the paper's key, then every script with boxes to mark written answers. */
function Grade({ exam }: { exam: Exam }) {
  const lang = useLang();
  const t = toolsCopy(lang).grade;
  const letters = copy(lang).room.poll.letters;
  const { data, state, reload } = useApi<{ submissions: Required<Submission>[] }>(`/api/exams/${exam.id}/submissions?as=teacher`);
  const [open, setOpen] = useState<string | null>(null);
  const written = exam.questions.filter((q) => q.kind === "written");

  return (
    <div className="mt-6">
      <details className="card p-4">
        <summary className="cursor-pointer text-sm font-semibold">{t.paper}</summary>
        <ol className="mt-3 space-y-3 text-sm">
          {exam.questions.map((q, i) => (
            <li key={q.id}>
              <Prompt q={q} i={i} />
              {q.kind === "mcq" && <p className="mt-1 text-ink-2">{q.options?.map((o, k) => <span key={k} className={`mr-3 ${k === q.answer ? "font-semibold text-leaf" : ""}`}>{letters[k]}. {o}{k === q.answer ? " ✓" : ""}</span>)}</p>}
            </li>
          ))}
        </ol>
      </details>

      <h2 className="mt-6 text-lg font-semibold">{t.h}</h2>
      {state === "loading" ? <Note>{toolsCopy(lang).loading}</Note> : !data?.submissions.length ? <Note>{t.none}</Note> : (
        <ul className="mt-3 space-y-2">
          {data.submissions.map((s) => (
            <li key={s.id} className="card p-4">
              <button onClick={() => setOpen(open === s.id ? null : s.id)} className="flex w-full items-center justify-between gap-3 text-left">
                <span className="font-medium">{s.student_name}</span>
                <span className="text-sm">
                  {t.total(Number(s.total), exam.maxMarks)} ·{" "}
                  <span className={s.checked ? "text-leaf" : "text-redpen"}>{s.checked ? t.checked : t.todo}</span>
                </span>
              </button>
              {open === s.id && <Script exam={exam} sub={s} written={written} onSaved={reload} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Script({ exam, sub, written, onSaved }: { exam: Exam; sub: Required<Submission>; written: ExamQuestion[]; onSaved: () => void }) {
  const lang = useLang();
  const t = toolsCopy(lang).grade;
  const [marks, setMarks] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(sub.manual).map(([k, v]) => [k, String(v)])));
  const [saved, setSaved] = useState(false);
  return (
    <div className="mt-3 border-t border-line pt-3 text-sm">
      <p className="text-ink-2">{t.auto(Number(sub.auto_score))}</p>
      {written.map((q) => (
        <div key={q.id} className="mt-3">
          <Prompt q={q} i={exam.questions.indexOf(q)} />
          <p className="mt-1 whitespace-pre-wrap rounded bg-mist p-2">{(sub.answers[q.id] as string) || toolsCopy(lang).take.noAnswer}</p>
          <label className="mt-1 flex items-center justify-end gap-2">
            <input value={marks[q.id] ?? ""} onChange={(e) => { setSaved(false); setMarks((m) => ({ ...m, [q.id]: e.target.value.replace(/[^\d.]/g, "") })); }} inputMode="decimal" className="field w-20 py-1! text-right" />
            <span className="text-ink-3">{t.outOf(q.marks)}</span>
          </label>
        </div>
      ))}
      {written.length > 0 && (
        <div className="mt-3 text-right">
          <button
            onClick={async () => {
              const body = { marks: Object.fromEntries(Object.entries(marks).filter(([, v]) => v !== "").map(([k, v]) => [k, Number(v)])) };
              const r = await fetch(`/api/exams/${exam.id}/submissions/${sub.id}?as=teacher`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
              if (r.ok) { setSaved(true); onSaved(); }
            }}
            className="btn-board text-sm"
          >
            {saved ? t.saved : t.save}
          </button>
        </div>
      )}
    </div>
  );
}
