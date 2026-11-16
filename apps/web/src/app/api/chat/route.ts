import { fail, json } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { canChat, openThread, threads } from "@/lib/growth/chat";
import { isEmail, me } from "@/lib/growth/people";

export const dynamic = "force-dynamic";

/** GET: my conversations, newest first. */
export async function GET() {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  return json({ threads: await threads(m.email) });
}

/** POST { to: email } → { id } of the conversation (created when allowed). */
export async function POST(req: Request) {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  const b = (await req.json().catch(() => null)) as { to?: string } | null;
  const to = String(b?.to ?? "").trim().toLowerCase();
  if (!isEmail(to)) return fail("bad", 400);
  if (!(await canChat(m.email, to))) return fail("forbidden", 403);
  return json({ id: await openThread(m.email, to) });
}
