"use client";
import { useEffect, useRef, useState } from "react";

/** The lecture sheet in a frame, with a topic list that jumps to each `.part-head`. */
export default function SheetView({ href, topics, start, labels }: { href: string; topics: { no: string; title: string }[]; start: number; labels: { topics: string; full: string; print: string } }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [cur, setCur] = useState(start);
  const [ready, setReady] = useState(false);

  const jump = (i: number) => {
    setCur(i);
    const doc = frame.current?.contentDocument;
    const el = doc?.querySelectorAll(".part-head")[i];
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    const u = new URL(window.location.href);
    u.searchParams.set("t", String(i));
    window.history.replaceState(null, "", u);
  };

  useEffect(() => { if (ready) jump(start); }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
      {topics.length > 0 && (
        <nav aria-label={labels.topics} className="lg:sticky lg:top-4 lg:self-start">
          <div className="eyebrow">{labels.topics}</div>
          <ol className="mt-2 flex gap-2 overflow-x-auto pb-2 text-sm lg:flex-col lg:gap-1 lg:overflow-visible">
            {topics.map((t, i) => (
              <li key={i} className="shrink-0">
                <button type="button" onClick={() => jump(i)} className={`w-full rounded-lg px-2 py-1.5 text-left ${cur === i ? "bg-board text-white" : "hover:bg-mist"}`}>
                  <span className="mr-1.5 text-xs opacity-70">{t.no}</span>{t.title}
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex gap-2 text-sm">
            <a href={href} target="_blank" rel="noreferrer" className="btn-ghost px-3! py-1.5!">{labels.full}</a>
            <button type="button" className="btn-ghost px-3! py-1.5!" onClick={() => frame.current?.contentWindow?.print()}>{labels.print}</button>
          </div>
        </nav>
      )}
      <iframe ref={frame} src={href} title="sheet" onLoad={() => setReady(true)} className="h-[78vh] w-full rounded-lg border border-line bg-white" />
    </div>
  );
}
