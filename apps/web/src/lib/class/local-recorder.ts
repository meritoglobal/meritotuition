"use client";
import { RoomEvent, Track, type Participant, type Room } from "livekit-client";

type AnyTrack = { mediaStreamTrack?: MediaStreamTrack } | undefined;

/**
 * Records the class on the viewer's own device: no server, no storage bill.
 *
 * What goes in: the tutor's board/screen (or camera when nothing is shared),
 * the tutor's camera as a small tile, and everyone's audio. It is drawn onto a
 * canvas and recorded with MediaRecorder. Every 5 seconds the recorded piece is
 * written to IndexedDB, so a crash, a dead battery or closing the tab keeps
 * everything up to that point; the file can be saved later from the class page
 * or the dashboard.
 */

const DB = "mm-rec";
const W = 960, H = 540, FPS = 15;
const MIME = ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp8,opus", "video/webm"];
const KEEP_DAYS = 7;

/** The best format this browser can record: MP4 where possible (plays everywhere), else WebM. */
export const pickMime = () => (typeof MediaRecorder === "undefined" ? "" : MIME.find((t) => MediaRecorder.isTypeSupported(t)) ?? "");

export interface RecMeta { id: string; classId: string; title: string; mime: string; startedAt: number; endedAt?: number; size: number; saved?: boolean }

// ---------- IndexedDB ----------
function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("recs", { keyPath: "id" });
      r.result.createObjectStore("chunks", { keyPath: ["id", "seq"] });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const req = <T,>(r: IDBRequest<T>) => new Promise<T>((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function tx<T>(stores: string[], mode: IDBTransactionMode, f: (t: IDBTransaction) => Promise<T>): Promise<T> {
  const d = await db();
  const t = d.transaction(stores, mode);
  const out = await f(t);
  await new Promise<void>((res, rej) => { t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
  d.close();
  return out;
}
const putMeta = (m: RecMeta) => tx(["recs"], "readwrite", async (t) => { t.objectStore("recs").put(m); });

export const recordingSupported = () =>
  typeof window !== "undefined" && "MediaRecorder" in window && "indexedDB" in window && !!HTMLCanvasElement.prototype.captureStream;

export async function listRecordings(): Promise<RecMeta[]> {
  if (!recordingSupported()) return [];
  const all = await tx(["recs"], "readonly", (t) => req(t.objectStore("recs").getAll() as IDBRequest<RecMeta[]>));
  // Housekeeping: drop recordings older than a week (the student has had them saved by then).
  const old = all.filter((m) => Date.now() - m.startedAt > KEEP_DAYS * 864e5);
  for (const m of old) await removeRecording(m.id);
  return all.filter((m) => !old.includes(m) && m.size > 0).sort((a, b) => b.startedAt - a.startedAt);
}

export async function removeRecording(id: string) {
  await tx(["recs", "chunks"], "readwrite", async (t) => {
    t.objectStore("recs").delete(id);
    t.objectStore("chunks").delete(IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]));
  });
}

async function assemble(m: RecMeta): Promise<Blob> {
  const parts = await tx(["chunks"], "readonly", (t) =>
    req(t.objectStore("chunks").getAll(IDBKeyRange.bound([m.id, 0], [m.id, Number.MAX_SAFE_INTEGER])) as IDBRequest<{ seq: number; blob: Blob }[]>));
  parts.sort((a, b) => a.seq - b.seq);
  return new Blob(parts.map((p) => p.blob), { type: m.mime.split(";")[0] });
}

const pad = (n: number) => String(n).padStart(2, "0");
export function fileName(m: RecMeta) {
  const d = new Date(m.startedAt + 6 * 3600e3); // Dhaka time
  const ext = m.mime.includes("mp4") ? "mp4" : "webm";
  return `mastermoshai-class-${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}.${ext}`;
}

/** Puts the file on the device: a normal download, or the share sheet on iPhone/iPad ("Save to Files"). */
export async function saveRecording(m: RecMeta, viaShare = false) {
  const blob = await assemble(m);
  const name = fileName(m);
  const file = new File([blob], name, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (viaShare && nav.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: m.title }).catch(() => {});
  } else {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
  }
  await putMeta({ ...m, saved: true });
}

export const isIOS = () => typeof navigator !== "undefined" && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

// ---------- the recorder ----------
export class LocalRecorder {
  meta: RecMeta;
  private canvas = document.createElement("canvas");
  private videos = new Map<string, HTMLVideoElement>();
  private audio: AudioContext;
  private dest: MediaStreamAudioDestinationNode;
  private sources = new Map<string, MediaStreamAudioSourceNode>();
  private rec: MediaRecorder | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private seq = 0;
  private writes: Promise<unknown> = Promise.resolve();
  private onSub = () => this.syncAudio();

  private persist: boolean;
  private onData?: (b: Blob) => void;

  /** persist: keep pieces on this device (IndexedDB). onData: each ~5 s piece, e.g. to upload it. */
  constructor(private room: Room, classId: string, title: string, opts: { persist?: boolean; onData?: (b: Blob) => void } = {}) {
    this.persist = opts.persist ?? true;
    this.onData = opts.onData;
    this.canvas.width = W;
    this.canvas.height = H;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audio = new AC();
    this.dest = this.audio.createMediaStreamDestination();
    // A silent node keeps the audio track alive before anyone speaks.
    const g = this.audio.createGain(); g.gain.value = 0;
    const o = this.audio.createOscillator(); o.connect(g); g.connect(this.dest); o.start();
    const mime = pickMime();
    this.meta = { id: `${classId}-${Date.now().toString(36)}`, classId, title, mime: mime || "video/webm", startedAt: Date.now(), size: 0 };
  }

  async start() {
    void this.audio.resume().catch(() => {});
    // Browsers keep audio suspended until a tap; resume on the next one.
    const wake = () => { void this.audio.resume().catch(() => {}); };
    document.addEventListener("pointerdown", wake, { once: true });

    this.room.on(RoomEvent.TrackSubscribed, this.onSub).on(RoomEvent.TrackUnsubscribed, this.onSub).on(RoomEvent.ParticipantDisconnected, this.onSub)
      .on(RoomEvent.LocalTrackPublished, this.onSub).on(RoomEvent.LocalTrackUnpublished, this.onSub);
    this.syncAudio();
    this.timer = setInterval(() => this.draw(), 1000 / FPS);
    this.draw();

    const stream = new MediaStream([...this.canvas.captureStream(FPS).getVideoTracks(), ...this.dest.stream.getAudioTracks()]);
    const opts: MediaRecorderOptions = { videoBitsPerSecond: 600_000, audioBitsPerSecond: 64_000 };
    if (this.meta.mime && MediaRecorder.isTypeSupported(this.meta.mime)) opts.mimeType = this.meta.mime;
    this.rec = new MediaRecorder(stream, opts);
    this.meta.mime = this.rec.mimeType || this.meta.mime;
    this.rec.ondataavailable = (e) => {
      if (!e.data.size) return;
      const seq = this.seq++;
      this.meta.size += e.data.size;
      this.onData?.(e.data);
      if (!this.persist) return;
      const meta = { ...this.meta };
      this.writes = this.writes.then(() => tx(["recs", "chunks"], "readwrite", async (t) => {
        t.objectStore("chunks").put({ id: meta.id, seq, blob: e.data });
        t.objectStore("recs").put(meta);
      })).catch(() => {});
    };
    if (this.persist) await putMeta(this.meta);
    this.rec.start(5000);
  }

  /** Finishes the file. Returns the saved recording (or null if nothing was recorded). */
  async stop(): Promise<RecMeta | null> {
    const r = this.rec;
    this.rec = null;
    if (r && r.state !== "inactive") {
      await new Promise<void>((res) => { r.onstop = () => res(); r.stop(); });
    }
    if (this.timer) clearInterval(this.timer);
    this.room.off(RoomEvent.TrackSubscribed, this.onSub).off(RoomEvent.TrackUnsubscribed, this.onSub).off(RoomEvent.ParticipantDisconnected, this.onSub)
      .off(RoomEvent.LocalTrackPublished, this.onSub).off(RoomEvent.LocalTrackUnpublished, this.onSub);
    for (const v of this.videos.values()) v.srcObject = null;
    this.videos.clear();
    void this.audio.close().catch(() => {});
    await this.writes;
    this.meta.endedAt = Date.now();
    if (this.persist) await putMeta(this.meta).catch(() => {});
    return this.meta.size > 0 ? this.meta : null;
  }

  // Everyone's microphone (and screen-share sound) mixed into one track.
  private syncAudio() {
    const live = new Set<string>();
    const people: Participant[] = [...this.room.remoteParticipants.values()];
    if (this.localIsTeacher()) people.push(this.room.localParticipant); // the tutor's own voice
    for (const p of people) {
      for (const pub of p.audioTrackPublications.values()) {
        const mst = (pub.track as AnyTrack)?.mediaStreamTrack;
        if (!mst) continue;
        live.add(mst.id);
        if (this.sources.has(mst.id)) continue;
        const s = this.audio.createMediaStreamSource(new MediaStream([mst]));
        s.connect(this.dest);
        this.sources.set(mst.id, s);
      }
    }
    for (const [k, s] of this.sources) if (!live.has(k)) { s.disconnect(); this.sources.delete(k); }
  }

  private localIsTeacher() { return this.room.localParticipant?.attributes?.role === "teacher"; }

  private video(t: AnyTrack) {
    const mst = t?.mediaStreamTrack;
    if (!mst || mst.readyState === "ended") return null;
    let v = this.videos.get(mst.id);
    if (!v) {
      v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      v.srcObject = new MediaStream([mst]);
      void v.play().catch(() => {});
      this.videos.set(mst.id, v);
    }
    return v.videoWidth ? v : null;
  }

  private draw() {
    const ctx = this.canvas.getContext("2d")!;
    ctx.fillStyle = "#0f231d";
    ctx.fillRect(0, 0, W, H);
    const teacher: Participant | undefined = this.localIsTeacher()
      ? this.room.localParticipant
      : [...this.room.remoteParticipants.values()].find((p) => p.attributes?.role === "teacher");
    if (!teacher) return;
    const screen = this.video(teacher.getTrackPublication(Track.Source.ScreenShare)?.track as AnyTrack);
    const camPub = teacher.getTrackPublication(Track.Source.Camera);
    const cam = camPub?.isMuted ? null : this.video(camPub?.track as AnyTrack);
    const contain = (v: HTMLVideoElement, x: number, y: number, w: number, h: number) => {
      const k = Math.min(w / v.videoWidth, h / v.videoHeight);
      const dw = v.videoWidth * k, dh = v.videoHeight * k;
      ctx.drawImage(v, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    };
    if (screen) {
      const th = H * 0.5, tw = (th * 9) / 16;
      contain(screen, 0, 0, cam ? W - tw - 16 : W, H);
      if (cam) {
        // Tutor camera as a 9:16 tile on the right.
        const x = W - tw - 8, y = H - th - 8;
        const ratio = tw / th;
        let sw = cam.videoWidth, sh = cam.videoHeight;
        if (sw / sh > ratio) sw = sh * ratio; else sh = sw / ratio;
        ctx.drawImage(cam, (cam.videoWidth - sw) / 2, (cam.videoHeight - sh) / 2, sw, sh, x, y, tw, th);
      }
    } else if (cam) contain(cam, 0, 0, W, H);
  }
}
