import type { Lang } from "@mastermoshai/core";
import type { ScheduleChange } from "@/lib/biz/schedule";
import { bizCopy } from "@/lib/copy-biz";
import { L } from "@/lib/l10n";

const slots = (s: { day: number; time: string; minutes: number }[], lang: Lang) =>
  s.map((x) => `${L.day(x.day as 0, lang)} ${L.time(x.time, lang)}`).join(", ");

/** One routine-change proposal: what changes, who agreed, and its status. */
export function ScheduleChangeCard({ ch, lang, children }: { ch: ScheduleChange; lang: Lang; children?: React.ReactNode }) {
  const c = bizCopy(lang).routine;
  const agreed = (ch.votes ?? []).filter((v) => v.vote === "APPROVE").length;
  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-2">
        {ch.batch && <b>{ch.batch.title}</b>}
        <span className="tag">{ch.kind === "ROUTINE" ? c.kindRoutine : c.kindMove}</span>
        <span className={`tag ${ch.status === "APPROVED" ? "bg-home text-home-ink" : ch.status === "PENDING" ? "bg-gold/20" : "bg-mist"}`}>{c.status[ch.status]}</span>
      </div>
      {ch.kind === "ROUTINE" && ch.new_schedule && (
        <div className="mt-2 text-sm">
          {ch.batch && <div className="text-ink-3 line-through">{c.from}: {slots(ch.batch.schedule, lang)}</div>}
          <div><b>{c.routineTo}:</b> {slots(ch.new_schedule, lang)}</div>
        </div>
      )}
      {ch.kind === "RESCHEDULE" && ch.from_at && ch.to_at && <p className="mt-2 text-sm">{c.move(L.dateTime(new Date(ch.from_at), lang), L.dateTime(new Date(ch.to_at), lang))}</p>}
      {ch.note && <p className="mt-1 text-sm text-ink-2">“{ch.note}”</p>}
      {ch.required.length > 0 && <p className="mt-1 text-xs text-ink-3">{c.waiting(agreed, ch.required.length)}</p>}
      {children}
    </div>
  );
}
