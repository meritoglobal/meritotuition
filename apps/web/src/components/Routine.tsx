import { CLASS_LEVEL_LABEL, WEEKDAY_LABEL, classesPerMonth, formatTaka, openSeats, timeLabel, type WeeklySlot } from "@merito/core";

const DAYS = [6, 0, 1, 2, 3, 4, 5] as const; // BD week: Sat → Fri

export function RoutineList({ slots, teacherId, actions = true }: { slots: WeeklySlot[]; teacherId: string; actions?: boolean }) {
  return (
    <div className="space-y-3">
      {slots.map((s) => {
        const seats = openSeats(s);
        return (
          <div key={s.id} className="card grid gap-4 p-4 md:grid-cols-[auto_1fr_auto] md:items-center">
            <div className="flex gap-1">
              {DAYS.map((d) => (
                <span key={d} className={`grid h-10 w-10 place-items-center rounded-md text-xs font-bold ${s.days.includes(d) ? "bg-ink text-white" : "bg-mist text-ink-3"}`}>
                  {WEEKDAY_LABEL[d]}
                </span>
              ))}
            </div>
            <div>
              <div className="text-lg font-bold">{timeLabel(s.startTime)} · {s.durationMin} min</div>
              <div className="text-sm text-ink-2">
                {s.subjects.join(", ")} · {CLASS_LEVEL_LABEL[s.level]} ·{" "}
                <span className={`tag ${s.mode === "ONLINE" ? "bg-lilac" : "bg-mint"}`}>{s.mode === "ONLINE" ? "Online" : "At home"}</span>{" "}
                <span className="tag bg-mist">1:{s.batchSize}</span>{" "}
                <span className={`whitespace-nowrap font-semibold ${seats > 0 ? "text-leaf" : "text-coral"}`}>{seats > 0 ? `${seats} seat${seats > 1 ? "s" : ""} left` : "Full"}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-display text-xl font-extrabold">{formatTaka(s.monthlyPrice)}</div>
                <div className="text-xs text-ink-2">{classesPerMonth(s)} classes / month</div>
              </div>
              {actions && seats > 0 && (
                <div className="flex flex-col gap-1.5">
                  {s.trialSeats > 0 && <a href={`/book/${teacherId}/${s.id}?trial=1`} className="btn-sun px-3! py-1.5! text-sm!">Free trial</a>}
                  <a href={`/book/${teacherId}/${s.id}`} className="btn-ink px-3! py-1.5! text-sm!">Enroll</a>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
