import Link from "next/link";
import { CLASS_LEVEL_LABEL, formatTaka, hasTrialSeat, openSeats, type TeacherSummary } from "@mastermoshai/core";

const SWATCH = ["bg-sun", "bg-mint", "bg-lilac", "bg-coral/70"];

export function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2);
}

export function Avatar({ t, size = "md" }: { t: TeacherSummary; size?: "md" | "lg" }) {
  const i = t.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % SWATCH.length;
  const dim = size === "lg" ? "h-36 w-36 text-5xl" : "h-28 w-28 text-4xl";
  return (
    <div className={`${dim} ${SWATCH[i]} grid shrink-0 place-items-center rounded-lg font-display font-extrabold text-ink`}>
      {initials(t.name)}
    </div>
  );
}

/** Preply-style tutor row: photo, facts, stats, price block, two actions. */
export function TeacherCard({ t, distanceKm, highlight }: { t: TeacherSummary; distanceKm?: number; highlight?: boolean }) {
  const trial = t.routine.some(hasTrialSeat);
  const seats = t.routine.reduce((a, s) => a + openSeats(s), 0);
  return (
    <article className={`card flex flex-col gap-5 p-5 sm:flex-row ${highlight ? "border-ink!" : ""}`}>
      <Avatar t={t} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/teachers/${t.id}`} className="font-display text-2xl font-extrabold hover:underline">{t.name}</Link>
          {t.verified && <span className="tag bg-ink text-white">✓ Verified</span>}
        </div>
        <p className="mt-1 text-[15px] font-medium">{t.university} · <span className="text-ink-2">{t.department}</span></p>
        <ul className="mt-2 space-y-1 text-sm text-ink-2">
          <li>📚 {t.subjects.join(", ")} · {t.levels.map((l) => CLASS_LEVEL_LABEL[l]).join(", ")}</li>
          <li>
            {t.modes.includes("ONLINE") && <span className="tag mr-1 bg-lilac text-ink">Online</span>}
            {t.modes.includes("OFFLINE") && t.area && <span className="tag mr-1 bg-mint text-ink">Home · {t.area.name}{distanceKm !== undefined ? ` · ${distanceKm.toFixed(1)} km` : ""}</span>}
          </li>
        </ul>
        <p className="mt-3 line-clamp-2 text-[15px]">{t.bio}</p>
        <p className="mt-2 text-sm text-ink-2">⚡ {seats} seat{seats === 1 ? "" : "s"} open this month · {t.freeVideoCount} free classes</p>
      </div>
      <div className="flex shrink-0 flex-col gap-3 sm:w-56">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-display text-3xl font-extrabold">{formatTaka(t.fromPrice)}</div>
            <div className="text-sm text-ink-2">per month, from</div>
          </div>
        </div>
        <div className="flex gap-5 text-sm">
          <div><div className="text-lg font-bold">{t.rating.toFixed(1)} ★</div><div className="text-ink-2">{t.reviewCount} reviews</div></div>
          <div><div className="text-lg font-bold">{t.freeVideoCount}</div><div className="text-ink-2">videos</div></div>
        </div>
        {trial ? (
          <Link href={`/teachers/${t.id}#routine`} className="btn-sun">Book free trial</Link>
        ) : (
          <Link href={`/teachers/${t.id}#routine`} className="btn-ink">See routine</Link>
        )}
        <Link href={`/teachers/${t.id}`} className="btn-ghost">View profile</Link>
      </div>
    </article>
  );
}
