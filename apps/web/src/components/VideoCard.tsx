import Link from "next/link";
import { DEMO_TEACHERS, type DemoVideo, type Lang } from "@mastermoshai/core";
import { copy } from "@/lib/copy";
import { L } from "@/lib/l10n";

const BG = ["bg-sun", "bg-lilac", "bg-mint", "bg-coral/80"];

export function VideoCard({ v, i = 0, lang }: { v: DemoVideo; i?: number; lang: Lang }) {
  const t = DEMO_TEACHERS.find((x) => x.id === v.teacherId);
  const c = copy(lang).videos;
  return (
    <div className="group">
      <div className={`relative flex aspect-video flex-col justify-between overflow-hidden rounded-xl border-2 border-ink p-4 ${BG[i % BG.length]}`}>
        <span className="tag w-fit bg-ink text-white">{L.subject(v.subject, lang)} · {L.videoLevel(v.level, lang)}</span>
        <div className="font-display pr-14 text-xl font-extrabold leading-tight">{L.videoTitle(v, lang)}</div>
        <span className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-ink text-white transition group-hover:scale-110">▶</span>
        <span className="absolute bottom-3 right-3 text-xs font-semibold">{c.min(v.durationMin)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        {t ? <Link href={`/teachers/${t.id}`} className="font-semibold hover:underline">{L.name(t, lang)}</Link> : <span />}
        <span className="text-ink-2">{c.views(v.views)}</span>
      </div>
    </div>
  );
}
