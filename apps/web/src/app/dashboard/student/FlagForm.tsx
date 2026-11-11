"use client";
import { useState } from "react";
import { copy } from "@/lib/copy";
import { useLang } from "@/lib/lang-client";

const REASONS = ["TEACHER_ABSENT", "TEACHER_LATE", "ENDED_EARLY", "POOR_TEACHING", "BEHAVIOUR", "OTHER"] as const;

export default function FlagForm({ classes }: { classes: { id: string; label: string }[] }) {
  const c = copy(useLang()).flag;
  const [sent, setSent] = useState<string | null>(null);
  const [reason, setReason] = useState<string>("POOR_TEACHING");
  if (sent) {
    return (
      <div className="card border-ink! bg-sun p-5 text-sm">
        <div className="font-semibold">{c.got}</div>
        <p className="mt-1 text-ink">{sent}</p>
      </div>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // POST /flags { attendanceId, reason, details }
        setSent(
          ["TEACHER_ABSENT", "TEACHER_LATE", "ENDED_EARLY"].includes(reason)
            ? c.sentAttendance
            : c.sentOther,
        );
      }}
      className="card p-5"
    >
      <h2 className="font-display text-2xl font-extrabold">{c.h2}</h2>
      <p className="text-sm text-ink-2">{c.sub}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <select className="rounded-lg border-2 border-line px-3 py-2 text-sm font-medium">
          {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-lg border-2 border-line px-3 py-2 text-sm font-medium">
          {REASONS.map((v) => <option key={v} value={v}>{c.reasons[v]}</option>)}
        </select>
      </div>
      <textarea placeholder={c.placeholder} className="mt-3 w-full rounded-lg border-2 border-line px-3 py-2 text-sm font-medium" rows={3} />
      <button className="mt-3 btn-ink">{c.submit}</button>
    </form>
  );
}
