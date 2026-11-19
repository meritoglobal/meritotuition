import Link from "next/link";
import type { ClassLevel, Lang } from "@mastermoshai/core";
import { PackageCard } from "@/app/packages/PackageCard";
import { VideoFrame } from "@/components/growth/VideoFrame";
import { marketCopy } from "@/lib/copy-market";
import { L } from "@/lib/l10n";
import type { Package } from "@/lib/growth/packages";
import type { PublicTutor } from "@/lib/growth/tutors";

/** The profile itself. Two layouts: video-led when the tutor has a video, plain text header when not. */
export default function TutorView({ t, pkgs, lang }: { t: PublicTutor; pkgs: Package[]; lang: Lang }) {
  const c = marketCopy(lang);
  const modes = [t.teachesOnline && c.tutor.online, t.teachesHome && (t.homeArea ? `${c.tutor.home} (${c.tutor.within(L.area(t.homeArea, lang), t.homeRadiusKm ?? 5)})` : c.tutor.home)].filter(Boolean);
  const head = (
    <>
      <h1 className="font-display text-4xl">{t.name} {t.pro && <span className="tag bg-gold align-middle text-base text-ink">{c.pro.badge}</span>}</h1>
      {t.headline && <p className="mt-1 text-lg text-ink-2">{t.headline}</p>}
      {(t.university || t.department) && <p className="mt-1 text-sm text-ink-3">{[t.university && L.uni(t.university, lang), t.department].filter(Boolean).join(" · ")}</p>}
    </>
  );
  const cta = <Link href="/requests" className="btn-gold inline-block">{c.tutor.ask}</Link>;
  const v = t.video;
  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      {v ? (
        // With a video: the video leads, name and the call to action sit beside it (below it on phones).
        <section className={`grid items-start gap-6 ${v.vertical ? "md:grid-cols-[minmax(0,320px)_1fr]" : "md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"}`}>
          <div className={v.vertical ? "mx-auto w-full max-w-[280px] md:max-w-[320px]" : ""}><VideoFrame video={v} title={`${t.name}: ${c.video.watch}`} /></div>
          <div className="md:pt-2">
            {head}
            {t.bio && <p className="mt-4 line-clamp-[8] whitespace-pre-wrap">{t.bio}</p>}
            <div className="mt-6">{cta}</div>
          </div>
        </section>
      ) : (
        // Without one there is no video section at all: a plain text header.
        <section className="max-w-3xl">
          {head}
          {t.bio && <p className="mt-4 whitespace-pre-wrap">{t.bio}</p>}
          <div className="mt-6">{cta}</div>
        </section>
      )}
      <dl className="card mt-8 grid gap-3 p-5 text-sm sm:grid-cols-2">
        <div><dt className="text-ink-3">{c.tutor.subjects}</dt><dd className="font-medium">{L.subjects(t.subjects, lang) || "—"}</dd></div>
        <div><dt className="text-ink-3">{c.tutor.classes}</dt><dd className="font-medium">{t.levels.map((l) => L.level(l as ClassLevel, lang)).join(", ") || "—"}</dd></div>
        <div><dt className="text-ink-3">{c.tutor.modes}</dt><dd className="font-medium">{modes.join(", ") || "—"}</dd></div>
        <div><dt className="text-ink-3">{c.tutor.price}</dt><dd className="font-medium">
          {[t.priceOnline && `${c.tutor.online}: ${L.taka(t.priceOnline, lang)}`, t.priceHome && `${c.tutor.home}: ${L.taka(t.priceHome, lang)}`].filter(Boolean).join(" · ") || "—"}
        </dd></div>
      </dl>
      {pkgs.length > 0 && (
        <>
          <h2 className="mt-8 font-semibold">{c.tutor.packages}</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">{pkgs.map((p) => <PackageCard key={p.id} p={p} lang={lang} />)}</div>
        </>
      )}
    </div>
  );
}
