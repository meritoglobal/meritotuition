import { DEMO_VIDEOS } from "@mastermoshai/core";
import { VideoCard } from "@/components/VideoCard";
import { copy } from "@/lib/copy";
import { getLang } from "@/lib/lang";

export default async function VideosPage() {
  const lang = await getLang();
  const c = copy(lang).videos;
  return (
    <>
      <section className="bg-board text-white">
        <div className="mx-auto max-w-7xl px-5 py-12">
          <h1 className="font-display text-5xl sm:text-6xl">{c.h1}</h1>
          <p className="mt-3 max-w-xl text-lg text-white/75">{c.sub}</p>
        </div>
      </section>
      <div className="mx-auto mt-10 grid max-w-7xl gap-6 px-5 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_VIDEOS.map((v, i) => <VideoCard key={v.id} v={v} i={i} lang={lang} />)}
      </div>
    </>
  );
}
