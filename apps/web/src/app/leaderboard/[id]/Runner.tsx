"use client";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ExamQuestion } from "@mastermoshai/core";
import { growthCopy } from "@/lib/copy-growth";
import { L } from "@/lib/l10n";
import { useLang } from "@/lib/lang-client";
import type { TestState } from "../actions";

export function StartForm({ action, name }: { action: (s: TestState, f: FormData) => Promise<TestState>; name: string }) {
  const g = growthCopy(useLang());
  const c = g.test;
  const [state, run, pending] = useActionState<TestState, FormData>(action, null);
  return (
    <form action={run} className="card space-y-3 p-5">
      <label className="field"><span>{c.name}</span><input name="name" defaultValue={name} maxLength={60} required /></label>
      <label className="field"><span>{c.school}</span><input name="school" maxLength={80} /></label>
      <p className="text-sm text-ink-2">{c.rules}</p>
      {state?.error && <p className="text-sm text-redpen">{state.error === "closed" ? c.closed : g.error}</p>}
      <button disabled={pending} className="btn-gold w-full">{c.start}</button>
    </form>
  );
}

const KEY = (id: string) => `mm_test_${id}`;

/** Timed MCQ paper. Answers are kept in the browser until submit, and sent automatically when time runs out. */
export function TestRunner({ testId, questions, endsAt }: { testId: string; questions: ExamQuestion[]; endsAt: number }) {
  const lang = useLang();
  const c = growthCopy(lang).test;
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem(KEY(testId)) ?? "{}"); } catch { return {}; }
  });
  const [left, setLeft] = useState(() => Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
  const [busy, setBusy] = useState(false);
  const sent = useRef(false);

  const submit = useCallback(async () => {
    if (sent.current) return;
    sent.current = true;
    setBusy(true);
    await fetch(`/api/leaderboard/${testId}/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers }) }).catch(() => null);
    try { localStorage.removeItem(KEY(testId)); } catch {}
    router.refresh();
  }, [answers, router, testId]);

  useEffect(() => { try { localStorage.setItem(KEY(testId), JSON.stringify(answers)); } catch {} }, [answers, testId]);
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, Math.round((endsAt - Date.now()) / 1000))), 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  useEffect(() => { if (left === 0) void submit(); }, [left, submit]);

  const done = Object.keys(answers).length;
  return (
    <div>
      <div className="sticky top-16 z-10 flex items-center justify-between rounded-xl bg-board px-4 py-3 text-white">
        <span>{L.num(done, lang)}/{L.num(questions.length, lang)}</span>
        <span className={`font-mono text-xl font-bold ${left < 60 ? "text-gold" : ""}`}>{c.left}: {c.min(left)}</span>
      </div>
      <ol className="mt-4 space-y-4">
        {questions.map((q, i) => (
          <li key={q.id} className="card p-4">
            <div className="font-medium">{L.num(i + 1, lang)}. {q.prompt}</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {q.options?.map((o, k) => (
                <label key={k} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${answers[q.id] === k ? "border-board bg-board text-white" : "border-line hover:border-ink-3"}`}>
                  <input type="radio" name={q.id} checked={answers[q.id] === k} onChange={() => setAnswers((a) => ({ ...a, [q.id]: k }))} className="sr-only" />
                  <span className="font-semibold">{lang === "bn" ? "কখগঘঙ"[k] : "ABCDE"[k]}.</span> {o}
                </label>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <button disabled={busy} onClick={() => { if (confirm(c.sure)) void submit(); }} className="btn-gold mt-6 w-full">{c.submit}</button>
    </div>
  );
}
