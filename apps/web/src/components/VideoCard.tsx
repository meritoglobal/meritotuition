import Link from "next/link";
import { DEMO_TEACHERS, type DemoVideo } from "@mastermoshai/core";

const BG = ["bg-sun", "bg-lilac", "bg-mint", "bg-coral/80"];

export function VideoCard({ v, i = 0 }: { v: DemoVideo; i?: number }) {
  const t = DEMO_TEACHERS.find((x) => x.id === v.teacherId);
  return (
    <div className="group">
      <div className={`relative flex aspect-video flex-col justify-between overflow-hidden rounded-xl border-2 border-ink p-4 ${BG[i % BG.length]}`}>
        <span className="tag w-fit bg-ink text-white">{v.subject} · {v.level}</span>
        <div className="font-display text-xl font-extrabold leading-tight">{v.title}</div>
        <span className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-ink text-white transition group-hover:scale-110">▶</span>
        <span className="absolute bottom-3 right-3 text-xs font-semibold">{v.durationMin} min</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        {t ? <Link href={`/teachers/${t.id}`} className="font-semibold hover:underline">{t.name}</Link> : <span />}
        <span className="text-ink-2">{(v.views / 1000).toFixed(1)}k views</span>
      </div>
    </div>
  );
}
