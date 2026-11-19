import { classAccess, denied } from "@/lib/class-access";
import { fail, json } from "@/lib/api";
import { safeClassId } from "@/lib/data";
import { R2_LIVE, completeUpload, createUpload, partUrl, recPrefix } from "@/lib/r2";

export const dynamic = "force-dynamic";

type Body =
  | { op: "start"; ext?: string; type?: string }
  | { op: "part"; key: string; uploadId: string; n: number }
  | { op: "complete"; key: string; uploadId: string; parts: { n: number; etag: string }[] };

/**
 * Tutor's device uploads the class recording to R2 while the class runs:
 * start → a signed URL per ~8 MB part → complete. The bytes go straight from
 * the tutor's browser to R2, never through our server.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = safeClassId((await ctx.params).id);
  const v = await classAccess(req, id);
  if (denied(v)) return fail(v.error, v.error === "login" ? 401 : 403);
  if (v.role !== "teacher") return fail("forbidden", 403);
  if (!R2_LIVE) return fail("rec-off", 503);
  // sendBeacon (page closing) posts text/plain; parse either way.
  const b = (JSON.parse((await req.text().catch(() => "")) || "null") ?? {}) as Body;
  try {
    if (b.op === "start") {
      const ext = b.ext === "mp4" ? "mp4" : "webm";
      const stamp = new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 16).replace(/[-:T]/g, "");
      const key = `${recPrefix(id)}class-${stamp}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const uploadId = await createUpload(key, ext === "mp4" ? "video/mp4" : "video/webm");
      return json({ key, uploadId });
    }
    if (!("key" in b) || typeof b.key !== "string" || !b.key.startsWith(recPrefix(id)) || b.key.includes("..") || typeof b.uploadId !== "string") return fail("bad", 400);
    if (b.op === "part") {
      if (!Number.isInteger(b.n) || b.n < 1 || b.n > 10000) return fail("bad", 400);
      return json({ url: await partUrl(b.key, b.uploadId, b.n) });
    }
    if (b.op === "complete") {
      const parts = (Array.isArray(b.parts) ? b.parts : []).filter((p) => Number.isInteger(p.n) && typeof p.etag === "string");
      if (!parts.length) return fail("bad", 400);
      await completeUpload(b.key, b.uploadId, parts);
      return json({ ok: true });
    }
    return fail("bad", 400);
  } catch {
    return fail("r2", 502);
  }
}
