/** Browser-side upload of a class file: signed URL → direct PUT to storage → register. */
export type UploadResult = "ok" | "off" | "bad" | "error";

export async function uploadClassFile(
  classId: string,
  asQ: string,
  f: File,
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  const base = `/api/class/${encodeURIComponent(classId)}/files`;
  const r = await fetch(`${base}/upload-url${asQ}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: f.name, size: f.size }) });
  if (r.status === 503) return "off";
  if (!r.ok) return r.status === 400 ? "bad" : "error";
  const { path, signedUrl } = (await r.json()) as { path: string; signedUrl: string };
  // XHR so we can show progress on slow connections.
  const ok = await new Promise<boolean>((res) => {
    const x = new XMLHttpRequest();
    x.open("PUT", signedUrl);
    x.setRequestHeader("content-type", f.type || "application/octet-stream");
    x.setRequestHeader("x-upsert", "false");
    x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((100 * e.loaded) / e.total)); };
    x.onload = () => res(x.status >= 200 && x.status < 300);
    x.onerror = () => res(false);
    onProgress?.(0);
    x.send(f);
  });
  if (!ok) return "error";
  const reg = await fetch(`${base}${asQ}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path, title: f.name, size: f.size, mime: f.type }) });
  return reg.ok ? "ok" : "error";
}
