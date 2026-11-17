import Link from "next/link";
import type { ClassLevel } from "@mastermoshai/core";
import { Off } from "@/components/growth/Off";
import { growthCopy } from "@/lib/copy-growth";
import { marketCopy } from "@/lib/copy-market";
import { DATA_LIVE } from "@/lib/data";
import { getLang } from "@/lib/lang";
import { L } from "@/lib/l10n";
import { browse } from "@/lib/growth/packages";
import { publicTutor } from "@/lib/growth/tutors";
import { PackageCard } from "@/app/packages/PackageCard";

export const dynamic = "force-dynamic";

/** Public profile of a tutor who signed up (the /teachers pages still show demo tutors). */
export default async function TutorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lang = await getLang();
  const c = marketCopy(lang);
  if (!DATA_LIVE) return <div className="mx-auto max-w-4xl px-5 py-10"><Off text={growthCopy(lang).off} /></div>;
  const t = await publicTutor(decodeURIComponent(id));
  if (!t) return <div className="mx-auto max-w-4xl px-5 py-10"><Off text={c.tutor.notFound} /></div>;
  const pkgs = await browse({ teacher: t.id });
  const modes = [t.teachesOnline && c.tutor.online, t.teachesHome && (t.homeArea ? `${c.tutor.home} (${c.tutor.within(L.area(t.homeArea, lang), t.homeRadiusKm ?? 5)})` : c.tutor.home)].filter(Boolean);
  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="font-display text-4xl">{t.name} {t.pro && <span className="tag bg-gold align-middle text-base text-ink">{c.pro.badge}</span>}</h1>
      {t.headline && <p className="mt-1 text-lg text-ink-2">{t.headline}</p>}
      <p className="mt-1 text-sm text-ink-3">{[t.university && L.uni(t.university, lang), t.department].filter(Boolean).join(" · ")}</p>
      {t.bio && <p className="mt-4 max-w-2xl whitespace-pre-wrap">{t.bio}</p>}
      <dl className="card mt-6 grid gap-3 p-5 text-sm sm:grid-cols-2">
        <div><dt className="text-ink-3">{c.tutor.subjects}</dt><dd className="font-medium">{L.subjects(t.subjects, lang) || "—"}</dd></div>
        <div><dt className="text-ink-3">{c.tutor.classes}</dt><dd className="font-medium">{t.levels.map((l) => L.level(l as ClassLevel, lang)).join(", ") || "—"}</dd></div>
        <div><dt className="text-ink-3">{c.tutor.modes}</dt><dd className="font-medium">{modes.join(", ") || "—"}</dd></div>
        <div><dt className="text-ink-3">{c.tutor.price}</dt><dd className="font-medium">
          {[t.priceOnline && `${c.tutor.online}: ${L.taka(t.priceOnline, lang)}`, t.priceHome && `${c.tutor.home}: ${L.taka(t.priceHome, lang)}`].filter(Boolean).join(" · ") || "—"}
        </dd></div>
      </dl>
      <h2 className="mt-8 font-semibold">{c.tutor.packages}</h2>
      {pkgs.length === 0 ? <p className="mt-2 text-sm text-ink-3">{c.tutor.noPackages}</p> : (
        <div className="mt-3 grid gap-3 md:grid-cols-2">{pkgs.map((p) => <PackageCard key={p.id} p={p} lang={lang} />)}</div>
      )}
      <Link href="/requests" className="btn-gold mt-8 inline-block">{c.tutor.ask}</Link>
    </div>
  );
}
