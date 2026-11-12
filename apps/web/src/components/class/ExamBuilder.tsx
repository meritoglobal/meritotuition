"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_OPTIONS } from "@mastermoshai/core";
import { toolsCopy } from "@/lib/copy-tools";
import { copy } from "@/lib/copy";
import { useLang } from "@/lib/lang-client";

interface Draft { key: number; kind: "mcq" | "written"; prompt: string; options: string[]; answer: number; marks: number }
let seq = 0;
const blank = (kind: Draft["kind"]): Draft => ({ key: ++seq, kind, prompt: "", options: kind === "mcq" ? ["", "", "", ""] : [], answer: -1, marks: kind === "mcq" ? 1 : 5 });

/** Tutor builds a paper: any mix of MCQ (2 to 5 options) and written questions. */
export default function ExamBuilder({ classId }: { classId: string }) {
  const lang = useLang();
  const t = toolsCopy(lang).builder;
  const letters = copy(lang).room.poll.letters;
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [instr, setInstr] = useState("");
  const [dur, setDur] = useState("");
  const [qs, setQs] = useState<Draft[]>([blank("mcq")]);
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState<Set<string>>(new Set());
  const [err, setErr] = useState("");

  const set = (i: number, p: Partial<Draft>) => setQs((a) => a.map((q, j) => (j === i ? { ...q, ...p } : q)));
  const move = (i: number, d: number) => setQs((a) => { const b = [...a]; const [x] = b.splice(i, 1); b.splice(i + d, 0, x!); return b; });
  const total = qs.reduce((s, q) => s + (Number(q.marks) || 0), 0);

  async function save(publish: boolean) {
    setBusy(true); setErr("");
    const r = await fetch(`/api/class/${encodeURIComponent(classId)}/exams?as=teacher`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, instructions: instr, durationMin: Number(dur) || null, publish, questions: qs.map(({ key: _k, ...q }) => q) }),
    });
    setBusy(false);
    if (r.ok) return router.push(`/class/${encodeURIComponent(classId)}?as=teacher&tab=exams`);
    const j = await r.json().catch(() => ({}));
    setBad(new Set<string>(j.errors ?? []));
    setErr(r.status === 400 ? t.errors : toolsCopy(lang).error);
  }
  const red = (k: string) => (bad.has(k) ? "border-redpen!" : "");

  return (
    <div>
      <Link href={`/class/${encodeURIComponent(classId)}?as=teacher&tab=exams`} className="text-sm text-ink-2">{t.back}</Link>
      <h1 className="mt-2 font-display text-3xl">{t.h}</h1>

      <div className="card mt-6 grid gap-3 p-5">
        <label className="text-sm font-medium">{t.title}<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.titlePh} className={`field mt-1 w-full ${red("title")}`} /></label>
        <label className="text-sm font-medium">{t.instr}<textarea value={instr} onChange={(e) => setInstr(e.target.value)} placeholder={t.instrPh} rows={2} className="field mt-1 w-full" /></label>
        <label className="text-sm font-medium">{t.duration}<input value={dur} onChange={(e) => setDur(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className="field mt-1 w-32" /></label>
      </div>

      {qs.map((q, i) => (
        <div key={q.key} className="card mt-4 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{t.q(i + 1)} · {toolsCopy(lang).exams.kinds[q.kind]}</span>
            <span className="flex items-center gap-1 text-sm">
              <button disabled={i === 0} onClick={() => move(i, -1)} className="px-2 disabled:opacity-30">{t.up}</button>
              <button disabled={i === qs.length - 1} onClick={() => move(i, 1)} className="px-2 disabled:opacity-30">{t.down}</button>
              <button onClick={() => setQs((a) => a.filter((_, j) => j !== i))} className="px-2 text-redpen">{t.remove}</button>
            </span>
          </div>
          <textarea value={q.prompt} onChange={(e) => set(i, { prompt: e.target.value })} placeholder={t.prompt} rows={2} className={`field mt-2 w-full ${red(`q${i + 1}:prompt`)}`} />
          {q.kind === "mcq" && (
            <div className={`mt-2 grid gap-1.5 rounded-lg p-1 ${bad.has(`q${i + 1}:answer`) ? "ring-1 ring-redpen" : ""}`}>
              <span className="text-xs text-ink-3">{t.correct}</span>
              {q.options.map((o, k) => (
                <div key={k} className="flex items-center gap-2">
                  <input type="radio" name={`ans-${q.key}`} checked={q.answer === k} onChange={() => set(i, { answer: k })} aria-label={t.correct} className="h-4 w-4 accent-[var(--color-board)]" />
                  <span className="w-5 text-sm font-semibold">{letters[k]}.</span>
                  <input value={o} onChange={(e) => set(i, { options: q.options.map((x, j) => (j === k ? e.target.value : x)) })} className={`field min-w-0 flex-1 py-1.5! text-sm ${bad.has(`q${i + 1}:option-empty`) && !o.trim() ? "border-redpen!" : ""}`} />
                  {q.options.length > 2 && (
                    <button onClick={() => set(i, { options: q.options.filter((_, j) => j !== k), answer: q.answer === k ? -1 : q.answer > k ? q.answer - 1 : q.answer })} className="px-1 text-ink-3">✕</button>
                  )}
                </div>
              ))}
              {q.options.length < MAX_OPTIONS && <button onClick={() => set(i, { options: [...q.options, ""] })} className="w-fit text-sm text-ink-2">{t.addOpt}</button>}
            </div>
          )}
          <label className="mt-3 flex items-center gap-2 text-sm">{t.marks}
            <input value={q.marks || ""} onChange={(e) => set(i, { marks: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })} inputMode="decimal" className={`field w-20 py-1! ${red(`q${i + 1}:marks`)}`} />
          </label>
        </div>
      ))}

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => setQs((a) => [...a, blank("mcq")])} className="btn-ghost text-sm">{t.addMcq}</button>
        <button onClick={() => setQs((a) => [...a, blank("written")])} className="btn-ghost text-sm">{t.addWritten}</button>
      </div>

      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-chalk py-4">
        <span className="text-sm font-semibold">{t.total(total)}</span>
        <span className="flex gap-2">
          <button disabled={busy} onClick={() => save(false)} className="btn-ghost text-sm">{busy ? t.saving : t.save}</button>
          <button disabled={busy} onClick={() => save(true)} className="btn-board text-sm">{busy ? t.saving : t.savePublish}</button>
        </span>
        {err && <p role="alert" className="w-full text-sm text-redpen">{err}</p>}
      </div>
    </div>
  );
}
