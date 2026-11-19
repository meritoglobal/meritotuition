import { fail, json } from "@/lib/api";
import { DATA_LIVE, db } from "@/lib/data";
import { me } from "@/lib/growth/people";

export const dynamic = "force-dynamic";

/** GET → { unread, items: [{ id, kind, title, body, path, read, at }] } (latest 50). Tap → open `path`. */
export async function GET() {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return json({ unread: 0, items: [] });
  const { data } = await db().from("app_notifications").select("id,kind,title,body,path,read,created_at").eq("email", m.email).order("id", { ascending: false }).limit(50);
  const items = (data ?? []).map((n) => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, path: n.path, read: n.read, at: n.created_at }));
  return json({ unread: items.filter((n) => !n.read).length, items });
}

/** POST { ids?: number[] } → mark read (all when ids is missing). */
export async function POST(req: Request) {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return json({ ok: true });
  const b = (await req.json().catch(() => ({}))) as { ids?: number[] };
  let q = db().from("app_notifications").update({ read: true }).eq("email", m.email).eq("read", false);
  if (Array.isArray(b.ids)) q = q.in("id", b.ids.filter(Number.isInteger).slice(0, 200));
  await q;
  return json({ ok: true });
}
