import { classAccess, denied } from "@/lib/class-access";
import { fail, json } from "@/lib/api";
import { BUCKET, DATA_LIVE, db, safeClassId } from "@/lib/data";

export const dynamic = "force-dynamic";

const ALLOWED = /\.(pdf|ppt|pptx|doc|docx|xls|xlsx|png|jpe?g|webp|zip)$/i;
const MAX = 100 * 1024 * 1024;

/**
 * POST (tutor) { name, size } → a one-time signed upload link. The browser
 * uploads straight to storage, so big PDFs/PPTs never pass through our server.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = safeClassId((await ctx.params).id);
  const v = await classAccess(req, id);
  if (denied(v)) return fail(v.error, v.error === "login" ? 401 : 403);
  if (v.role !== "teacher") return fail("forbidden", 403);
  if (!DATA_LIVE) return fail("data-off", 503);
  const b = (await req.json().catch(() => null)) as { name?: string; size?: number } | null;
  const name = (b?.name ?? "").normalize("NFKC");
  if (!ALLOWED.test(name)) return fail("type", 400);
  if (typeof b?.size !== "number" || b.size <= 0 || b.size > MAX) return fail("size", 400);
  const ext = name.split(".").pop()!.toLowerCase();
  const stem = name.slice(0, -(ext.length + 1)).replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 60) || "file";
  const path = `materials/${id}/${Date.now().toString(36)}-${stem}.${ext}`;
  const { data, error } = await db().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return fail("storage", 500);
  return json({ path, signedUrl: data.signedUrl });
}
