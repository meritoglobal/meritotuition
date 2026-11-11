import Link from "next/link";
import { CLASS_LEVEL_LABEL, formatTaka, hasTrialSeat, type TeacherSummary } from "@merito/core";

export function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2);
}

export function TeacherCard({ t, distanceKm }: { t: TeacherSummary; distanceKm?: number }) {
  const trial = t.routine.some(hasTrialSeat);
  return (
    <Link href={`/teachers/${t.id}`} className="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand-500 hover:shadow-sm">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700">{initials(t.name)}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold group-hover:text-brand-700">{t.name}</h3>
          {t.verified && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">✓ Verified</span>}
        </div>
        <p className="text-sm text-slate-600">{t.university} · {t.department}</p>
        <p className="mt-1 text-sm text-slate-500">
          {t.subjects.join(", ")} · {t.levels.map((l) => CLASS_LEVEL_LABEL[l]).join(", ")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-amber-600">★ {t.rating.toFixed(1)} ({t.reviewCount})</span>
          {t.modes.map((m) => (
            <span key={m} className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{m === "ONLINE" ? "Online" : `Home tutor${t.area ? ` · ${t.area.name}` : ""}`}</span>
          ))}
          {distanceKm !== undefined && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{distanceKm.toFixed(1)} km away</span>}
          {trial && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">Free trial open</span>}
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs text-slate-500">from</div>
        <div className="font-semibold">{formatTaka(t.fromPrice)}</div>
        <div className="text-xs text-slate-500">/month</div>
      </div>
    </Link>
  );
}
