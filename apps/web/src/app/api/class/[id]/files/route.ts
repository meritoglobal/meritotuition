import { classViewer } from "@/lib/class-access";
import { fail, json } from "@/lib/api";
import { BUCKET, DATA_LIVE, db, safeClassId } from "@/lib/data";

export const dynamic = "force-dynamic";
const HOUR = 3600;

/** GET: class materials and recordings, each with a 1-hour download link. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await classViewer(req))) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  const id = safeClassId((await ctx.params).id);
  const s = db();
  const { data: rows, error } = await s.from("class_materials").select("id,title,path,size_bytes,mime,created_at").eq("class_id", id).order("created_at", { ascending: false });
  if (error) return fail("db", 500);
  const { data: recs } = await s.storage.from(BUCKET).list(`recordings/${id}`, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
  const recordings = (recs ?? []).filter((f) => f.name.endsWith(".mp4"));
  const paths = [...(rows ?? []).map((r) => r.path), ...recordings.map((f) => `recordings/${id}/${f.name}`)];
  const { data: signed } = paths.length ? await s.storage.from(BUCKET).createSignedUrls(paths, HOUR) : { data: [] };
  const url = (p: string) => signed?.find((x) => x.path === p)?.signedUrl ?? null;
  return json({
    materials: (rows ?? []).map((r) => ({ id: r.id, title: r.title, size: r.size_bytes, mime: r.mime, at: r.created_at, url: url(r.path) })),
    recordings: recordings.map((f) => ({ name: f.name, at: f.created_at, size: (f.metadata as { size?: number } | null)?.size ?? null, url: url(`recordings/${id}/${f.name}`) })),
  });
}

/** POST (tutor): register a file already uploaded through the signed upload link. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const v = await classViewer(req);
  if (!v) return fail("login", 401);
  if (v.role !== "teacher") return fail("forbidden", 403);
  if (!DATA_LIVE) return fail("data-off", 503);
  const id = safeClassId((await ctx.params).id);
  const b = (await req.json().catch(() => null)) as { path?: string; title?: string; size?: number; mime?: string } | null;
  if (!b?.path?.startsWith(`materials/${id}/`) || b.path.includes("..")) return fail("bad-path", 400);
  const { error } = await db().from("class_materials").insert({
    class_id: id, path: b.path, title: (b.title || b.path.split("/").pop() || "file").slice(0, 200),
    size_bytes: typeof b.size === "number" ? b.size : null, mime: b.mime?.slice(0, 120) ?? null, uploaded_by: v.user.id,
  });
  return error ? fail("db", 500) : json({ ok: true });
}

/** DELETE ?mid= (tutor): remove a material. */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const v = await classViewer(req);
  if (!v) return fail("login", 401);
  if (v.role !== "teacher") return fail("forbidden", 403);
  if (!DATA_LIVE) return fail("data-off", 503);
  const id = safeClassId((await ctx.params).id);
  const mid = new URL(req.url).searchParams.get("mid") ?? "";
  const s = db();
  const { data: row } = await s.from("class_materials").select("path").eq("id", mid).eq("class_id", id).maybeSingle();
  if (!row) return fail("not-found", 404);
  await s.storage.from(BUCKET).remove([row.path]);
  await s.from("class_materials").delete().eq("id", mid);
  return json({ ok: true });
}
