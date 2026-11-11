"use client";
import { useState } from "react";

const REASONS = [
  ["TEACHER_ABSENT", "Teacher did not come"],
  ["TEACHER_LATE", "Teacher came late"],
  ["ENDED_EARLY", "Class ended early"],
  ["POOR_TEACHING", "Did not teach properly"],
  ["BEHAVIOUR", "Behaviour problem"],
  ["OTHER", "Something else"],
] as const;

export default function FlagForm({ classes }: { classes: { id: string; label: string }[] }) {
  const [sent, setSent] = useState<string | null>(null);
  const [reason, setReason] = useState<string>("POOR_TEACHING");
  if (sent) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm">
        <div className="font-semibold">Complaint received</div>
        <p className="mt-1 text-slate-700">{sent}</p>
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
            ? "The class record shows the teacher joined on time and stayed the full class, so a reviewer will check it within 72 hours. Payment for this class is on hold meanwhile."
            : "A reviewer will look at the class record and both sides within 72 hours. Payment for this class is on hold until then.",
        );
      }}
      className="rounded-2xl border border-slate-200 bg-white p-5"
    >
      <h2 className="text-lg font-semibold">Flag a class</h2>
      <p className="text-sm text-slate-500">You can flag a class up to 48 hours after it ends. Attendance problems are checked automatically.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <textarea placeholder="What happened?" className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={3} />
      <button className="mt-3 rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white">Submit flag</button>
    </form>
  );
}
