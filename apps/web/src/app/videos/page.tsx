import { DEMO_VIDEOS } from "@mastermoshai/core";
import { VideoCard } from "@/components/VideoCard";

export default function VideosPage() {
  return (
    <>
      <section className="border-b-2 border-ink bg-mint">
        <div className="mx-auto max-w-7xl px-5 py-12">
          <h1 className="font-display text-5xl font-extrabold sm:text-6xl">Free classes</h1>
          <p className="mt-3 max-w-xl text-lg">Short lessons by Mastermoshai tutors. Like how someone teaches? Book a free trial with them.</p>
        </div>
      </section>
      <div className="mx-auto mt-10 grid max-w-7xl gap-6 px-5 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_VIDEOS.map((v, i) => <VideoCard key={v.id} v={v} i={i} />)}
      </div>
    </>
  );
}
