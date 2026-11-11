import { DEMO_VIDEOS } from "@merito/core";
import { VideoCard } from "@/components/VideoCard";

export default function VideosPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold">Free classes</h1>
      <p className="mt-1 text-slate-600">Short lessons from our tutors. Like a teacher? Book a free trial class with them.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{DEMO_VIDEOS.map((v) => <VideoCard key={v.id} v={v} />)}</div>
    </div>
  );
}
