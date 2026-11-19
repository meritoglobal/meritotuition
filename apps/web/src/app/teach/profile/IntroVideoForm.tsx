"use client";
import { useState } from "react";
import Link from "next/link";
import { marketCopy } from "@/lib/copy-market";
import { useLang } from "@/lib/lang-client";
import { VideoFrame, type Video } from "@/components/growth/VideoFrame";

const TYPES = ["video/mp4", "video/quicktime", "video/webm"];

/** Add, replace or remove the tutor's intro video (YouTube link or upload to R2 through a signed URL). */
export default function IntroVideoForm({ userId, initial, uploads, maxMb }: { userId: string; initial: Video | null; uploads: boolean; maxMb: number }) {
  const c = marketCopy(useLang()).video;
  const [video, setVideo] = useState<Video | null>(initial);
  const [tab, setTab] = useState<"yt" | "file">(uploads ? "file" : "yt");
  const [link, setLink] = useState("");
  const [vertical, setVertical] = useState(initial?.vertical ?? false);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const call = async (body: unknown, method = "POST") => {
    const r = await fetch("/api/teach/intro-video", { method, headers: { "content-type": "application/json" }, body: method === "POST" ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error ?? "other");
    return j;
  };
  const fail = (e: unknown) => setMsg({ ok: false, text: c.errors[(e as Error).message] ?? c.errors.other! });

  const saveLink = async () => {
    setBusy(true); setMsg(null);
    try { const j = await call({ youtube: link, vertical }); setVideo(j.video); setLink(""); setMsg({ ok: true, text: c.saved }); } catch (e) { fail(e); }
    setBusy(false);
  };

  const upload = async (file: File) => {
    setMsg(null);
    if (!TYPES.includes(file.type)) return fail(new Error("type"));
    if (file.size > maxMb * 1024 * 1024) return fail(new Error("size"));
    setBusy(true); setPct(0);
    try {
      // Tall or wide? Read it from the file itself.
      const tall = await new Promise<boolean>((res) => {
        const v = document.createElement("video");
        v.preload = "metadata"; v.src = URL.createObjectURL(file);
        v.onloadedmetadata = () => { res(v.videoHeight > v.videoWidth); URL.revokeObjectURL(v.src); };
        v.onerror = () => res(vertical);
      });
      setVertical(tall);
      const { key, putUrl } = await call({ upload: { type: file.type, size: file.size } });
      await new Promise<void>((res, rej) => {
        const x = new XMLHttpRequest();
        x.open("PUT", putUrl);
        x.setRequestHeader("content-type", file.type);
        x.upload.onprogress = (e) => e.lengthComputable && setPct(Math.round((e.loaded / e.total) * 100));
        x.onload = () => (x.status < 300 ? res() : rej(new Error("net")));
        x.onerror = () => rej(new Error("net"));
        x.send(file);
      });
      const j = await call({ finish: key, vertical: tall });
      setVideo(j.video); setMsg({ ok: true, text: c.saved });
    } catch (e) { fail(e); }
    setBusy(false); setPct(null);
  };

  const remove = async () => {
    setBusy(true); setMsg(null);
    try { await call(null, "DELETE"); setVideo(null); setMsg({ ok: true, text: c.removed }); } catch (e) { fail(e); }
    setBusy(false);
  };

  const tabCls = (on: boolean) => `tag cursor-pointer px-3! py-1.5! ${on ? "bg-board! text-white!" : ""}`;
  return (
    <section className="card mt-6 max-w-3xl p-5">
      <h2 className="font-display text-2xl">{c.h}</h2>
      <p className="mt-1 text-sm text-ink-2">{c.sub}</p>
      {video && (
        <div className="mt-4">
          <div className="text-xs font-semibold text-ink-3">{c.current}</div>
          <div className={`mt-2 ${video.vertical ? "max-w-[260px]" : "max-w-xl"}`}><VideoFrame video={video} title={c.current} /></div>
          <button type="button" disabled={busy} onClick={remove} className="btn-ghost mt-3 px-3! py-1.5! text-sm">{c.remove}</button>
        </div>
      )}
      <div className="mt-5 flex gap-2 text-sm">
        {uploads && <button type="button" className={tabCls(tab === "file")} onClick={() => setTab("file")}>{c.tabFile}</button>}
        <button type="button" className={tabCls(tab === "yt")} onClick={() => setTab("yt")}>{c.tabYt}</button>
      </div>
      {tab === "yt" ? (
        <div className="mt-3 grid gap-2">
          <div className="flex flex-wrap gap-2">
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder={c.ytPh} inputMode="url" className="field min-w-0 flex-1" />
            <button type="button" disabled={busy || !link.trim()} onClick={saveLink} className="btn-board">{c.ytSave}</button>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={vertical} onChange={(e) => setVertical(e.target.checked)} />{c.vertical}</label>
        </div>
      ) : (
        <div className="mt-3">
          <label className={`btn-gold inline-block cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
            {pct !== null ? c.uploading(pct) : c.pick}
            <input type="file" accept="video/mp4,video/quicktime,video/webm" className="sr-only" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f); }} />
          </label>
          <p className="mt-1 text-xs text-ink-3">{c.max(maxMb)}</p>
        </div>
      )}
      {msg && <p role="status" className={`mt-3 text-sm ${msg.ok ? "text-leaf" : "text-redpen"}`}>{msg.text}</p>}
      <Link href={`/tutor/${encodeURIComponent(userId)}`} className="mt-4 inline-block text-sm font-semibold underline">{c.see}</Link>
    </section>
  );
}
