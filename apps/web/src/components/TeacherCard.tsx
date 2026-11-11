import Link from "next/link";
import { hasTrialSeat, openSeats, type Lang, type TeacherSummary } from "@mastermoshai/core";
import { copy } from "@/lib/copy";
import { L } from "@/lib/l10n";

const SWATCH = ["bg-home text-home-ink", "bg-online text-online-ink", "bg-gold-tint text-ink", "bg-chalk-2 text-ink"];

/** Latin: "RH". Bangla: first grapheme of the first name (initial pairs read oddly in Bangla). */
export function initials(name: string) {
  if (/[\u0980-\u09ff]/.test(name)) return [...new Intl.Segmenter("bn", { granularity: "grapheme" }).segment(name)][0]?.segment ?? "";
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2);
}

export function Avatar({ t, size = "md", lang = "bn" }: { t: TeacherSummary; size?: "md" | "lg"; lang?: Lang }) {
  const i = t.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % SWATCH.length;
  const dim = size === "lg" ? "h-36 w-36 text-5xl" : "h-28 w-28 text-4xl";
  return (
    <div className={`${dim} ${SWATCH[i]} grid shrink-0 place-items-center rounded-xl font-bold`}>
      {initials(L.name(t, lang))}
    </div>
  );
}

/** Preply-style tutor row: photo, facts, stats, price block, two actions. */
export function TeacherCard({ t, distanceKm, highlight, lang }: { t: TeacherSummary; distanceKm?: number; highlight?: boolean; lang: Lang }) {
  const c = copy(lang).card;
  const trial = t.routine.some(hasTrialSeat);
  const seats = t.routine.reduce((a, s) => a + openSeats(s), 0);
  return (
    <article className={`card flex flex-col gap-5 p-5 transition-colors hover:border-ink-3 sm:flex-row ${highlight ? "border-ink-3!" : ""}`}>
      <Avatar t={t} lang={lang} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/teachers/${t.id}`} className="text-xl font-bold hover:underline">{L.name(t, lang)}</Link>
          {t.verified && <span className="tag bg-home text-home-ink">{c.verified}</span>}
        </div>
        <p className="mt-1 text-[15px] font-medium">{L.uni(t.university, lang)} · <span className="text-ink-2">{L.dept(t, lang)}</span></p>
        <ul className="mt-2 space-y-1 text-sm text-ink-2">
          <li>{L.subjects(t.subjects, lang)} · {t.levels.map((l) => L.level(l, lang)).join(", ")}</li>
          <li>
            {t.modes.includes("ONLINE") && <span className="tag mr-1 bg-online text-online-ink">{c.online}</span>}
            {t.modes.includes("OFFLINE") && t.area && <span className="tag mr-1 bg-home text-home-ink">{c.home} · {L.area(t.area.name, lang)}{distanceKm !== undefined ? ` · ${c.km(distanceKm.toFixed(1))}` : ""}</span>}
          </li>
        </ul>
        <p className="mt-3 line-clamp-2 text-[15px]">{L.bio(t, lang)}</p>
        <p className="mt-2 text-sm text-ink-2">{c.seats(seats, t.freeVideoCount)}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-3 sm:w-56">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl font-bold">{L.taka(t.fromPrice, lang)}</div>
            <div className="text-sm text-ink-2">{c.from}</div>
          </div>
        </div>
        <div className="flex gap-5 text-sm">
          <div><div className="text-lg font-bold">{L.num(t.rating.toFixed(1), lang)} ★</div><div className="text-ink-2">{c.reviews(t.reviewCount)}</div></div>
          <div><div className="text-lg font-bold">{L.num(t.freeVideoCount, lang)}</div><div className="text-ink-2">{c.videos}</div></div>
        </div>
        {trial ? (
          <Link href={`/teachers/${t.id}#routine`} className="btn-gold">{c.trial}</Link>
        ) : (
          <Link href={`/teachers/${t.id}#routine`} className="btn-ink">{c.routine}</Link>
        )}
        <Link href={`/teachers/${t.id}`} className="btn-ghost">{c.profile}</Link>
      </div>
    </article>
  );
}
