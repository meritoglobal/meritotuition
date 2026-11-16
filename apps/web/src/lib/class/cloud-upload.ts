"use client";
/**
 * Uploads the tutor's recording to R2 while the class runs, in ~8 MB parts
 * (multipart upload, straight from the browser to R2 via signed URLs).
 * At the end only the last few seconds are left to send.
 */
const PART = 8 * 1024 * 1024; // R2 needs ≥5 MB for every part but the last

let pending = 0;
const listeners = new Set<() => void>();
const bump = (d: number) => { pending += d; listeners.forEach((f) => f()); };
/** For "don't close this page yet" notes. */
export const uploadStore = {
  subscribe: (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; },
  get: () => pending,
};

export class CloudUpload {
  private buf: Blob[] = [];
  private bufSize = 0;
  private n = 0;
  private parts: { n: number; etag: string }[] = [];
  private queue: Promise<void> = Promise.resolve();
  private done = false;

  private constructor(private api: string, private key: string, private uploadId: string, private type: string) {}

  static async start(classId: string, mime: string): Promise<CloudUpload | null> {
    const api = `/api/class/${encodeURIComponent(classId)}/rec?as=teacher`;
    const ext = mime.includes("mp4") ? "mp4" : "webm";
    try {
      const r = await fetch(api, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op: "start", ext }) });
      if (!r.ok) return null;
      const { key, uploadId } = (await r.json()) as { key: string; uploadId: string };
      return new CloudUpload(api, key, uploadId, ext === "mp4" ? "video/mp4" : "video/webm");
    } catch { return null; }
  }

  push(b: Blob) {
    this.buf.push(b);
    this.bufSize += b.size;
    if (this.bufSize >= PART) this.flush();
  }

  private flush() {
    if (!this.bufSize) return;
    const blob = new Blob(this.buf, { type: this.type });
    this.buf = [];
    this.bufSize = 0;
    const n = ++this.n;
    bump(1);
    this.queue = this.queue.then(() => this.put(n, blob)).finally(() => bump(-1));
  }

  private async put(n: number, blob: Blob) {
    for (let i = 0; i < 5; i++) {
      try {
        const r = await fetch(this.api, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op: "part", key: this.key, uploadId: this.uploadId, n }) });
        if (r.ok) {
          const { url } = (await r.json()) as { url: string };
          const up = await fetch(url, { method: "PUT", body: blob });
          const etag = up.headers.get("etag");
          if (up.ok && etag) { this.parts.push({ n, etag }); return; }
        }
      } catch { /* retry */ }
      await new Promise((res) => setTimeout(res, 2000 * 2 ** i)); // weak network: 2s, 4s, 8s…
    }
  }

  /** Sends what is left and closes the file on R2. */
  async finish() {
    if (this.done) return;
    this.flush();
    bump(1);
    try {
      await this.queue;
      if (!this.parts.length) return;
      this.done = true;
      await fetch(this.api, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op: "complete", key: this.key, uploadId: this.uploadId, parts: this.parts }) });
    } finally { bump(-1); }
  }

  /** Page is closing: keep what has been uploaded so far (the last few seconds may be lost). */
  beacon() {
    if (this.done || !this.parts.length) return;
    this.done = true;
    navigator.sendBeacon(this.api, JSON.stringify({ op: "complete", key: this.key, uploadId: this.uploadId, parts: this.parts }));
  }
}
