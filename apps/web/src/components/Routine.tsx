import { CLASS_LEVEL_LABEL, WEEKDAY_LABEL, classesPerMonth, formatTaka, openSeats, timeLabel, type WeeklySlot } from "@merito/core";

export function RoutineList({ slots, teacherId, actions = true }: { slots: WeeklySlot[]; teacherId: string; actions?: boolean }) {
  return (
    <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
      {slots.map((s) => {
        const seats = openSeats(s);
        return (
          <div key={s.id} className="flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-48 flex-1">
              <div className="font-medium">
                {s.days.map((d) => WEEKDAY_LABEL[d]).join(" · ")} · {timeLabel(s.startTime)}
              </div>
              <div className="text-sm text-slate-500">
                {s.subjects.join(", ")} · {CLASS_LEVEL_LABEL[s.level]} · {s.durationMin} min · {s.mode === "ONLINE" ? "Online live class" : "At home"}
              </div>
            </div>
            <div className="text-sm">
              <div className="font-medium">1:{s.batchSize} batch</div>
              <div className={seats > 0 ? "text-brand-700" : "text-red-600"}>{seats > 0 ? `${seats} seat${seats > 1 ? "s" : ""} open` : "Full"}</div>
            </div>
            <div className="text-sm">
              <div className="font-semibold">{formatTaka(s.monthlyPrice)}/month</div>
              <div className="text-slate-500">{classesPerMonth(s)} classes</div>
            </div>
            {actions && (
              <div className="flex gap-2">
                {s.trialSeats > 0 && seats > 0 && (
                  <a href={`/book/${teacherId}/${s.id}?trial=1`} className="rounded-full border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50">
                    Free trial
                  </a>
                )}
                {seats > 0 && (
                  <a href={`/book/${teacherId}/${s.id}`} className="rounded-full bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
                    Enroll
                  </a>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
