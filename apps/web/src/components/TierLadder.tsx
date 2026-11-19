import { COMMISSION_TIERS, type Lang, type Tier } from "@mastermoshai/core";
import { bizCopy } from "@/lib/copy-biz";
import { L } from "@/lib/l10n";

/** The commission ladder: 20% for new tutors down to 5% for experts. */
export function TierLadder({ lang, current, dark = false, tiers = COMMISSION_TIERS }: { lang: Lang; current?: Tier["code"]; dark?: boolean; tiers?: Tier[] }) {
  const c = bizCopy(lang).tiers;
  return (
    <ol className="grid gap-2 sm:grid-cols-5">
      {tiers.map((t) => {
        const me = t.code === current;
        return (
          <li key={t.code} className={`rounded-xl border p-3 ${me ? "border-gold bg-gold/15" : dark ? "border-white/20" : "border-line bg-paper"}`}>
            <div className={`text-xs ${dark ? "text-white/60" : "text-ink-3"}`}>{c.row(t.minStudents)}</div>
            <div className="font-display text-3xl">{L.num(Math.round(t.rate * 100), lang)}%</div>
            <div className="text-sm font-semibold">{t.label[lang]}</div>
            {t.expertOnly && <div className={`mt-1 text-xs ${dark ? "text-gold" : "text-redpen"}`}>{c.expertOnly}</div>}
            {me && <div className="mt-1 text-xs font-bold">{c.you}</div>}
          </li>
        );
      })}
    </ol>
  );
}
