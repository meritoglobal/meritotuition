import { fail, json } from "@/lib/api";
import { getProfile } from "@/lib/batches";
import { DATA_LIVE } from "@/lib/data";
import { openThread } from "@/lib/growth/chat";
import { isUuid, me } from "@/lib/growth/people";
import { MAX_OPEN, acceptBid, bidsFor, getRequest, invite, isLive, myBid, openCount, setStatus, suggestions, tutorMaySee } from "@/lib/growth/requests";
import { pubBid, pubRequest } from "@/lib/growth/requests-api";
import { db } from "@/lib/data";

export const dynamic = "force-dynamic";

async function load(id: string) {
  const m = await me();
  if (!m) return { err: fail("login", 401) };
  if (!DATA_LIVE) return { err: fail("data-off", 503) };
  if (!isUuid(id)) return { err: fail("not-found", 404) };
  const r = await getRequest(id);
  if (!r) return { err: fail("not-found", 404) };
  return { m, r };
}

/**
 * GET → owner: { role: "student", request, bids: (Bid & { tutor })[], suggestions: (Tutor & { invited })[] }
 *       tutor: { role: "tutor", request, myBid, canBid }
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { m, r, err } = await load((await params).id);
  if (err) return err;
  if (r.student_email === m.email) {
    const [bids, more] = await Promise.all([bidsFor(r.id), isLive(r) ? suggestions(r) : Promise.resolve([])]);
    return json({ role: "student", request: pubRequest(r), bids: bids.map(({ tutor, ...b }) => ({ ...pubBid(b), tutor })), suggestions: more });
  }
  const t = await getProfile(m.user.id);
  if (!t || !(await tutorMaySee(r, t))) return fail("forbidden", 403);
  const mine = await myBid(r.id, t.user_id);
  return json({ role: "tutor", request: pubRequest(r), myBid: mine ? pubBid(mine) : null, canBid: isLive(r) && mine?.status !== "ACCEPTED" });
}

/**
 * POST { action } →
 *   student: "close" | "reopen" | "accept" { bidId } → { ok, threadId? } | "invite" { teacherId } → { ok } | "message" { bidId } → { threadId }
 *   tutor:   "message" → { threadId }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { m, r, err } = await load((await params).id);
  if (err) return err;
  const b = (await req.json().catch(() => ({}))) as { action?: string; bidId?: string; teacherId?: string };
  if (r.student_email === m.email) {
    switch (b.action) {
      case "close": return json({ ok: await setStatus(r, "CLOSED") });
      case "reopen": return r.status === "OPEN" || (await openCount(m.email)) >= MAX_OPEN ? fail("limit", 409) : json({ ok: await setStatus(r, "OPEN") });
      case "accept": {
        const won = isUuid(b.bidId ?? "") ? await acceptBid(r, b.bidId!) : null;
        return won ? json({ ok: true, threadId: await openThread(m.email, won.teacher_email) }) : fail("bad", 400);
      }
      case "invite": return json({ ok: typeof b.teacherId === "string" && (await invite(r, b.teacherId)) });
      case "message": {
        const { data } = isUuid(b.bidId ?? "") ? await db().from("request_bids").select("teacher_email").eq("id", b.bidId!).eq("request_id", r.id).maybeSingle() : { data: null };
        return data ? json({ threadId: await openThread(m.email, data.teacher_email) }) : fail("bad", 400);
      }
    }
    return fail("bad", 400);
  }
  const t = await getProfile(m.user.id);
  if (b.action !== "message" || !t || r.status === "CLOSED" || !(await tutorMaySee(r, t))) return fail("forbidden", 403);
  return json({ threadId: await openThread(m.email, r.student_email) });
}
