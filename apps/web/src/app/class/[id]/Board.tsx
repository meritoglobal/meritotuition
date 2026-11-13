"use client";
import { useCallback, useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { toolsCopy } from "@/lib/copy-tools";
import { useLang } from "@/lib/lang-client";
import { uploadClassFile } from "@/lib/class/upload";

/**
 * PDF board: the tutor opens a PDF, marks it up with a finger (pen, marker,
 * eraser), and students see it live. The board is drawn onto a canvas that is
 * published as the class's screen share, so it works from a phone (no screen
 * sharing needed) and shows up in the class recording. Closing the board or
 * leaving the class saves the marked-up PDF to the class files.
 */

type Tool = "pen" | "marker" | "eraser";
interface Stroke { tool: "pen" | "marker"; color: string; w: number; pts: [number, number][] }
interface Box { x: number; y: number; w: number; h: number }

const COLORS = ["#1a1a1a", "#c8372d", "#1d4ed8", "#15803d", "#f5c400"];
const WIDTH = { pen: 0.0035, marker: 0.022 }; // fraction of page width
const MARKER_ALPHA = 0.35;
const OUT_MAX = 1280; // streamed board size (long side)
const PAGE_MAX = 1800; // rendered page bitmap (long side)

function drawStrokes(ctx: CanvasRenderingContext2D, box: Box, strokes: Stroke[]) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const s of strokes) {
    if (!s.pts.length) continue;
    ctx.globalAlpha = s.tool === "marker" ? MARKER_ALPHA : 1;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = Math.max(1, s.w * box.w);
    ctx.beginPath();
    const [x0, y0] = s.pts[0]!;
    ctx.moveTo(box.x + x0 * box.w, box.y + y0 * box.h);
    if (s.pts.length === 1) ctx.lineTo(box.x + x0 * box.w + 0.01, box.y + y0 * box.h);
    for (let i = 1; i < s.pts.length; i++) ctx.lineTo(box.x + s.pts[i]![0] * box.w, box.y + s.pts[i]![1] * box.h);
    ctx.stroke();
  }
  ctx.restore();
}

const fit = (cw: number, ch: number, aspect: number): Box => {
  let w = cw, h = cw / aspect;
  if (h > ch) { h = ch; w = ch * aspect; }
  return { x: (cw - w) / 2, y: (ch - h) / 2, w, h };
};

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255] as const;
}

/** Builds the marked-up PDF: original pages with the strokes drawn on as vector paths. */
async function buildPdf(orig: ArrayBuffer, strokes: Record<number, Stroke[]>) {
  const { PDFDocument, rgb, LineCapStyle } = await import("pdf-lib");
  const doc = await PDFDocument.load(orig, { ignoreEncryption: true });
  doc.getPages().forEach((pg, i) => {
    const ss = strokes[i];
    if (!ss?.length) return;
    const box = pg.getCropBox();
    const W = box.width, H = box.height;
    const rot = ((pg.getRotation().angle % 360) + 360) % 360;
    // (u, v) are 0..1 in the page as displayed (rotation applied); map back to unrotated, y-down coords.
    const map = (u: number, v: number): [number, number] =>
      rot === 90 ? [v * W, (1 - u) * H] : rot === 180 ? [(1 - u) * W, (1 - v) * H] : rot === 270 ? [(1 - v) * W, u * H] : [u * W, v * H];
    const shownW = rot === 90 || rot === 270 ? H : W;
    for (const s of ss) {
      if (!s.pts.length) continue;
      const pts = s.pts.length === 1 ? [s.pts[0]!, [s.pts[0]![0] + 0.0005, s.pts[0]![1]] as [number, number]] : s.pts;
      const d = pts.map(([u, v], k) => { const [x, y] = map(u, v); return `${k ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`; }).join(" ");
      const [r, g, b] = hexToRgb(s.color);
      pg.drawSvgPath(d, {
        x: box.x, y: box.y + H,
        borderColor: rgb(r, g, b), borderWidth: Math.max(0.5, s.w * shownW),
        borderOpacity: s.tool === "marker" ? MARKER_ALPHA : 1, borderLineCap: LineCapStyle.Round,
      });
    }
  });
  return doc.save();
}

export default function Board({ classId, saveRef, onClose, onStatus }: {
  classId: string;
  saveRef: MutableRefObject<(() => Promise<void>) | null>;
  onClose: () => void;
  onStatus: (msg: string) => void;
}) {
  const lang = useLang();
  const t = toolsCopy(lang).board;
  const { localParticipant } = useLocalParticipant();

  const [phase, setPhase] = useState<"pick" | "loading" | "ready">("pick");
  const [err, setErr] = useState("");
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(0);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[1]!);
  const [busy, setBusy] = useState(false);

  const doc = useRef<PDFDocumentProxy | null>(null);
  const orig = useRef<{ bytes: ArrayBuffer; name: string } | null>(null);
  const strokes = useRef<Record<number, Stroke[]>>({});
  const cur = useRef<Stroke | null>(null);
  const dirty = useRef(false);
  const pageBmp = useRef<HTMLCanvasElement | null>(null);
  const pageRef = useRef(0);
  pageRef.current = page;

  const view = useRef<HTMLCanvasElement>(null);
  const viewWrap = useRef<HTMLDivElement>(null);
  const viewBox = useRef<Box>({ x: 0, y: 0, w: 1, h: 1 });
  const out = useRef<HTMLCanvasElement | null>(null);
  const outTrack = useRef<MediaStreamTrack | null>(null);
  const raf = useRef(0);

  // ---------- drawing ----------
  const paint = useCallback(() => {
    raf.current = 0;
    const bmp = pageBmp.current;
    const list = [...(strokes.current[pageRef.current] ?? []), ...(cur.current ? [cur.current] : [])];
    const v = view.current;
    if (v) {
      const ctx = v.getContext("2d")!;
      ctx.fillStyle = "#0f231d";
      ctx.fillRect(0, 0, v.width, v.height);
      if (bmp) {
        const b = fit(v.width, v.height, bmp.width / bmp.height);
        viewBox.current = b;
        ctx.fillStyle = "#fff";
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.drawImage(bmp, b.x, b.y, b.w, b.h);
        drawStrokes(ctx, b, list);
      }
    }
    const o = out.current;
    if (o && bmp) {
      const ctx = o.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, o.width, o.height);
      ctx.drawImage(bmp, 0, 0, o.width, o.height);
      drawStrokes(ctx, { x: 0, y: 0, w: o.width, h: o.height }, list);
    }
  }, []);
  const schedule = useCallback(() => { if (!raf.current) raf.current = requestAnimationFrame(paint); }, [paint]);

  // Keep the view canvas sized to its box (sharp on high-DPI phones).
  useEffect(() => {
    const el = viewWrap.current;
    if (!el || phase !== "ready") return;
    const ro = new ResizeObserver(() => {
      const v = view.current;
      if (!v) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      v.width = Math.max(1, Math.round(el.clientWidth * dpr));
      v.height = Math.max(1, Math.round(el.clientHeight * dpr));
      paint();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [phase, paint]);

  // Render the current page to a bitmap, resize the streamed canvas to its shape.
  useEffect(() => {
    const d = doc.current;
    if (!d || phase !== "ready") return;
    let cancel = false;
    void (async () => {
      const pg = await d.getPage(page + 1);
      const base = pg.getViewport({ scale: 1 });
      const scale = PAGE_MAX / Math.max(base.width, base.height);
      const vp = pg.getViewport({ scale });
      const c = document.createElement("canvas");
      c.width = Math.round(vp.width);
      c.height = Math.round(vp.height);
      await pg.render({ canvas: c, canvasContext: c.getContext("2d")!, viewport: vp }).promise;
      if (cancel) return;
      pageBmp.current = c;
      if (out.current) {
        const k = OUT_MAX / Math.max(c.width, c.height);
        out.current.width = Math.round(c.width * k);
        out.current.height = Math.round(c.height * k);
      }
      paint();
    })();
    return () => { cancel = true; };
  }, [page, phase, paint]);

  // ---------- publish the board as the class screen share ----------
  useEffect(() => {
    if (phase !== "ready") return;
    const o = document.createElement("canvas");
    o.width = OUT_MAX; o.height = Math.round(OUT_MAX * 9 / 16);
    out.current = o;
    paint();
    const track = o.captureStream(15).getVideoTracks()[0]!;
    outTrack.current = track;
    let published = false;
    void (async () => {
      if (localParticipant.isScreenShareEnabled) await localParticipant.setScreenShareEnabled(false).catch(() => {});
      await localParticipant.publishTrack(track, { source: Track.Source.ScreenShare, name: "board", simulcast: false, videoEncoding: { maxBitrate: 1_500_000, maxFramerate: 15 } });
      published = true;
    })().catch(() => {});
    // Repaint every second so the stream keeps sending frames (late joiners see the board at once).
    const keep = setInterval(paint, 1000);
    return () => {
      clearInterval(keep);
      if (published) void localParticipant.unpublishTrack(track).catch(() => {});
      track.stop();
      out.current = null;
      outTrack.current = null;
    };
  }, [phase, localParticipant, paint]);

  // ---------- open a PDF ----------
  async function openPdf(bytes: ArrayBuffer, name: string) {
    setErr("");
    setPhase("loading");
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const d = await pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise;
      doc.current = d;
      orig.current = { bytes, name };
      strokes.current = {};
      dirty.current = false;
      setPages(d.numPages);
      setPage(0);
      setPhase("ready");
    } catch {
      setErr(t.failed);
      setPhase("pick");
    }
  }

  // ---------- save ----------
  const save = useCallback(async () => {
    const o = orig.current;
    if (!o || !dirty.current || !Object.values(strokes.current).some((s) => s.length)) return;
    onStatus(t.saving);
    try {
      const bytes = await buildPdf(o.bytes, strokes.current);
      const name = `${o.name.replace(/\.pdf$/i, "")} (${t.suffix}).pdf`;
      const file = new File([bytes as BlobPart], name, { type: "application/pdf" });
      const res = await uploadClassFile(classId, "?as=teacher", file);
      if (res === "ok") onStatus(t.saved);
      else {
        // Class files not set up yet (or upload failed): hand the file to the tutor instead.
        const a = document.createElement("a");
        a.href = URL.createObjectURL(file);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
        onStatus(res === "off" ? t.downloaded : t.saveFailed);
      }
      dirty.current = false;
    } catch {
      onStatus(t.saveFailed);
    }
  }, [classId, onStatus, t]);
  useEffect(() => { saveRef.current = save; return () => { saveRef.current = null; }; }, [save, saveRef]);

  // ---------- pointer input ----------
  const activePointer = useRef<number | null>(null);
  const toPage = (e: React.PointerEvent | PointerEvent): [number, number] | null => {
    const v = view.current;
    if (!v) return null;
    const r = v.getBoundingClientRect();
    const sx = v.width / r.width, sy = v.height / r.height;
    const b = viewBox.current;
    const x = ((e.clientX - r.left) * sx - b.x) / b.w;
    const y = ((e.clientY - r.top) * sy - b.y) / b.h;
    return [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))];
  };
  const erase = (p: [number, number]) => {
    const list = strokes.current[pageRef.current];
    if (!list?.length) return;
    const aspect = viewBox.current.w / viewBox.current.h;
    const r = 0.02;
    const keep = list.filter((s) => !s.pts.some(([x, y]) => Math.hypot(x - p[0], (y - p[1]) / aspect) < r + s.w / 2));
    if (keep.length !== list.length) { strokes.current[pageRef.current] = keep; dirty.current = true; schedule(); }
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointer.current !== null) return; // ignore a second finger
    const p = toPage(e);
    if (!p) return;
    activePointer.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (tool === "eraser") { erase(p); return; }
    cur.current = { tool, color: tool === "marker" && color === COLORS[0] ? COLORS[4]! : color, w: WIDTH[tool], pts: [p] };
    schedule();
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerId !== activePointer.current) return;
    const evs = (e.nativeEvent.getCoalescedEvents?.() ?? []) as PointerEvent[];
    for (const ev of evs.length ? evs : [e.nativeEvent]) {
      const p = toPage(ev);
      if (!p) continue;
      if (tool === "eraser") erase(p);
      else cur.current?.pts.push(p);
    }
    schedule();
  };
  const up = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerId !== activePointer.current) return;
    activePointer.current = null;
    const s = cur.current;
    cur.current = null;
    if (s) {
      (strokes.current[pageRef.current] ??= []).push(s);
      dirty.current = true;
    }
    schedule();
  };

  const undo = () => { strokes.current[page]?.pop(); dirty.current = true; schedule(); };
  const clear = () => { strokes.current[page] = []; dirty.current = true; schedule(); };
  const go = (d: number) => setPage((p) => Math.min(pages - 1, Math.max(0, p + d)));

  if (phase !== "ready") {
    return <Picker classId={classId} loading={phase === "loading"} err={err} onPick={openPdf} onCancel={onClose} onlyPdf={(m) => setErr(m)} />;
  }

  const tb = (on: boolean) => `flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${on ? "bg-gold text-board" : "bg-white/10 text-white hover:bg-white/20"} disabled:opacity-40`;
  return (
    <div className="flex h-full w-full flex-col gap-2 landscape:flex-row">
      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto landscape:grid landscape:grid-cols-2 landscape:content-start landscape:justify-items-center landscape:gap-1 landscape:overflow-x-visible landscape:overflow-y-auto">
        <button title={t.pen} aria-label={t.pen} onClick={() => setTool("pen")} className={tb(tool === "pen")}><Icon d="M3 21l3.5-1 11-11-2.5-2.5-11 11L3 21zM14 5.5l2.5 2.5" /></button>
        <button title={t.marker} aria-label={t.marker} onClick={() => { setTool("marker"); if (color === COLORS[0]) setColor(COLORS[4]!); }} className={tb(tool === "marker")}><Icon d="M4 20h7M9 15l-3 3h4l1-1M9 15l8-8 3 3-8 8M9 15l3 3" /></button>
        <button title={t.eraser} aria-label={t.eraser} onClick={() => setTool("eraser")} className={tb(tool === "eraser")}><Icon d="M8 20h12M5 15l8-8 6 6-5 5H8l-3-3z" /></button>
        <span className="mx-1 h-6 w-px shrink-0 bg-white/20 landscape:hidden" />
        {COLORS.map((c) => (
          <button key={c} aria-label={c} onClick={() => { setColor(c); if (tool === "eraser") setTool("pen"); }} className={`h-8 w-8 shrink-0 rounded-full border-2 ${color === c && tool !== "eraser" ? "border-gold" : "border-white/30"}`} style={{ background: c }} />
        ))}
        <span className="mx-1 h-6 w-px shrink-0 bg-white/20 landscape:hidden" />
        <button title={t.undo} aria-label={t.undo} onClick={undo} className={tb(false)}><Icon d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" /></button>
        <button title={t.clear} aria-label={t.clear} onClick={clear} className={tb(false)}><Icon d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></button>
      </div>
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-1.5">
        <div ref={viewWrap} className="relative min-h-0 flex-1 overflow-hidden rounded-lg">
          <canvas ref={view} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
            className="absolute inset-0 h-full w-full touch-none select-none" style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }} />
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-1.5 text-xs text-white/70"><span className="h-2 w-2 rounded-full bg-redpen" />{t.live}</span>
          <span className="flex items-center gap-1.5">
            <button aria-label={t.prev} title={t.prev} disabled={page === 0} onClick={() => go(-1)} className={tb(false)}><Icon d="M15 5l-7 7 7 7" /></button>
            <span className="min-w-14 text-center tabular-nums">{t.page(page + 1, pages)}</span>
            <button aria-label={t.next} title={t.next} disabled={page >= pages - 1} onClick={() => go(1)} className={tb(false)}><Icon d="M9 5l7 7-7 7" /></button>
          </span>
          <button disabled={busy} onClick={async () => { setBusy(true); await save(); setBusy(false); onClose(); }} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-board disabled:opacity-50">{t.close}</button>
        </div>
      </div>
    </div>
  );
}

function Icon({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
}

const Card = ({ children }: { children: ReactNode }) => (
  <div className="flex h-full w-full items-center justify-center p-3">
    <div className="max-h-full w-full max-w-md overflow-y-auto rounded-xl bg-chalk p-4 text-ink">{children}</div>
  </div>
);

function Picker({ classId, loading, err, onPick, onCancel, onlyPdf }: {
  classId: string; loading: boolean; err: string;
  onPick: (bytes: ArrayBuffer, name: string) => void; onCancel: () => void; onlyPdf: (m: string) => void;
}) {
  const t = toolsCopy(useLang()).board;
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ id: string; title: string; url: string }[] | null>(null);
  useEffect(() => {
    void fetch(`/api/class/${encodeURIComponent(classId)}/files?as=teacher`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { materials?: { id: string; title: string; url: string | null; mime: string | null }[] } | null) =>
        setFiles((j?.materials ?? []).filter((m) => m.url && (m.mime === "application/pdf" || /\.pdf$/i.test(m.title))).map((m) => ({ id: m.id, title: m.title, url: m.url! }))))
      .catch(() => setFiles([]));
  }, [classId]);

  const fromUrl = async (f: { title: string; url: string }) => {
    try {
      const r = await fetch(f.url);
      onPick(await r.arrayBuffer(), f.title);
    } catch { onlyPdf(t.failed); }
  };

  if (loading) return <Card><p className="py-6 text-center text-sm">{t.loading}</p></Card>;
  return (
    <Card>
      <h3 className="font-semibold">{t.pickH}</h3>
      <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") return onlyPdf(t.onlyPdf);
        onPick(await f.arrayBuffer(), f.name);
      }} />
      <button onClick={() => input.current?.click()} className="btn-board mt-3 w-full text-sm">{t.fromPhone}</button>
      {files && files.length > 0 && (
        <>
          <div className="mt-4 text-sm font-semibold text-ink-2">{t.fromClass}</div>
          <ul className="mt-1 divide-y divide-line text-sm">
            {files.map((f) => (
              <li key={f.id}><button onClick={() => void fromUrl(f)} className="w-full truncate py-2 text-left hover:underline">{f.title}</button></li>
            ))}
          </ul>
        </>
      )}
      {err && <p role="alert" className="mt-3 text-sm text-redpen">{err}</p>}
      <div className="mt-3 text-right"><button onClick={onCancel} className="btn-ghost text-sm">{t.cancel}</button></div>
    </Card>
  );
}
