import Link from "next/link";
import type { ClassLevel, Lang } from "@mastermoshai/core";
import { growthCopy } from "@/lib/copy-growth";
import { L } from "@/lib/l10n";
import type { Package } from "@/lib/growth/packages";

export function PackageCard({ p, lang, cta = true }: { p: Package; lang: Lang; cta?: boolean }) {
  const c = growthCopy(lang).pkg;
  return (
    <div className="card flex flex-col p-5">
      <div className="text-xs text-ink-3">{L.subject(p.subject, lang)} · {L.level(p.level as ClassLevel, lang)}</div>
      <h3 className="mt-1 text-lg font-bold">{p.title}</h3>
      {p.teacher_name && <div className="text-sm text-ink-2">{c.with(p.teacher_name)}</div>}
      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
        <span className="tag bg-mist">{c.days(p.days_per_week)}</span>
        <span className="tag bg-mist">{c.classes(p.classes_per_month)}</span>
        <span className="tag bg-mist">{c.perClass(Math.round(p.price / p.classes_per_month))}</span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-2">
        <div><span className="text-2xl font-bold">{L.taka(p.price, lang)}</span><span className="text-sm text-ink-3">{c.perMonth}</span></div>
        {cta && <Link href={`/packages/${p.id}`} className="btn-gold px-4! py-2!">{c.buy}</Link>}
      </div>
    </div>
  );
}
