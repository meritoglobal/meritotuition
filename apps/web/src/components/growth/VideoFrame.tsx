/** A tutor's intro video: YouTube embed or the uploaded file. Shape follows the video (tall phone video or wide). */
export interface Video { kind: "YOUTUBE" | "FILE"; vertical: boolean; youtubeId?: string; embed?: string; src?: string }

export function VideoFrame({ video, title }: { video: Video; title: string }) {
  const shape = video.vertical ? "aspect-[9/16]" : "aspect-video";
  return (
    <div className={`${shape} w-full overflow-hidden rounded-xl bg-ink`}>
      {video.kind === "YOUTUBE"
        ? <iframe src={video.embed} title={title} className="h-full w-full" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
        : <video src={video.src} controls playsInline preload="metadata" className="h-full w-full object-contain" />}
    </div>
  );
}
