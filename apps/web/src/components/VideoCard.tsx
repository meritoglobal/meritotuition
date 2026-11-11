import Link from "next/link";
import { DEMO_TEACHERS, type DemoVideo } from "@porao/core";

export function VideoCard({ v }: { v: DemoVideo }) {
  const t = DEMO_TEACHERS.find((x) => x.id === v.teacherId);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-brand-700 to-brand-900 text-white">
        <span className="text-4xl">▶</span>
        <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 text-xs">{v.durationMin}:00</span>
      </div>
      <div className="p-3">
        <h4 className="line-clamp-2 text-sm font-medium">{v.title}</h4>
        <p className="mt-1 text-xs text-slate-500">
          {v.subject} · {v.level} · {(v.views / 1000).toFixed(1)}k views
        </p>
        {t && (
          <Link href={`/teachers/${t.id}`} className="mt-2 inline-block text-xs font-medium text-brand-700 hover:underline">
            {t.name} · Book free trial →
          </Link>
        )}
      </div>
    </div>
  );
}
