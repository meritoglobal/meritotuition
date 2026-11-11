import { classesPerMonth, openSeats, type Lang, type WeeklySlot } from "@mastermoshai/core";
import { copy } from "@/lib/copy";
import { L } from "@/lib/l10n";

const DAYS = [6, 0, 1, 2, 3, 4, 5] as const; // BD week: Sat → Fri

export function RoutineList({ slots, teacherId, actions = true, lang }: { slots: WeeklySlot[]; teacherId: string; actions?: boolean; lang: Lang }) {
  const c = copy(lang).routine;
  return (
    <div className="space-y-3">
      {slots.map((s) => {
        const seats = openSeats(s);
        return (
          <div key={s.id} className="card grid gap-4 p-4 md:grid-cols-[auto_1fr_auto] md:items-center">
            <div className="flex gap-1">
              {DAYS.map((d) => (
                <span key={d} className={`grid h-10 w-11 place-items-center rounded-md text-xs font-bold ${s.days.includes(d) ? "bg-ink text-white" : "bg-mist text-ink-3"}`}>
                  {L.day(d, lang)}
                </span>
              ))}
            </div>
            <div>
              <div className="text-lg font-bold">{L.time(s.startTime, lang)} · {c.min(s.durationMin)}</div>
              <div className="text-sm text-ink-2">
                {L.subjects(s.subjects, lang)} · {L.level(s.level, lang)} ·{" "}
                <span className={`tag ${s.mode === "ONLINE" ? "bg-lilac" : "bg-mint"}`}>{s.mode === "ONLINE" ? c.online : c.home}</span>{" "}
                <span className="tag bg-mist">{L.num(`1:${s.batchSize}`, lang)}</span>{" "}
                <span className={`whitespace-nowrap font-semibold ${seats > 0 ? "text-leaf" : "text-coral"}`}>{seats > 0 ? c.seats(seats) : c.full}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-display text-xl font-extrabold">{L.taka(s.monthlyPrice, lang)}</div>
                <div className="text-xs text-ink-2">{c.perMonth(classesPerMonth(s))}</div>
              </div>
              {actions && seats > 0 && (
                <div className="flex flex-col gap-1.5">
                  {s.trialSeats > 0 && <a href={`/book/${teacherId}/${s.id}?trial=1`} className="btn-sun px-3! py-1.5! text-sm!">{c.trial}</a>}
                  <a href={`/book/${teacherId}/${s.id}`} className="btn-ink px-3! py-1.5! text-sm!">{c.enroll}</a>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
