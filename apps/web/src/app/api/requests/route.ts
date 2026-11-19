import { fail, json } from "@/lib/api";
import { getProfile } from "@/lib/batches";
import { DATA_LIVE } from "@/lib/data";
import { displayName, me } from "@/lib/growth/people";
import { AREAS, MAX_OPEN, clean, feed, getPrefs, myBids, myRequests, openCount, postRequest } from "@/lib/growth/requests";
import { pubBid, pubRequest } from "@/lib/growth/requests-api";

export const dynamic = "force-dynamic";

/**
 * GET → { mine: Request[] (with bids count), areas, maxOpen }   (student)
 * GET ?feed=1[&all=1] → { feed: Request[] (with mine, bids, invited), myBids, prefs, hasProfile }   (tutor)
 */
export async function GET(req: Request) {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  const sp = new URL(req.url).searchParams;
  if (sp.get("feed")) {
    const t = await getProfile(m.user.id);
    if (!t) return json({ feed: [], myBids: [], prefs: null, hasProfile: false });
    const prefs = await getPrefs(t.user_id);
    const [list, bids] = await Promise.all([feed(t, prefs, Boolean(sp.get("all"))), myBids(t.user_id)]);
    return json({
      hasProfile: true, prefs,
      feed: list.map(({ mine, ...r }) => ({ ...pubRequest(r), mine: mine ? pubBid(mine) : null })),
      myBids: bids.map(({ request, ...b }) => ({ ...pubBid(b), request: request ? pubRequest(request) : null })),
    });
  }
  const mine = await myRequests(m.email);
  return json({ mine: mine.map((r) => ({ ...pubRequest(r), bids: r.bids })), areas: AREAS, maxOpen: MAX_OPEN });
}

/** POST { subject, level, mode: "HOME"|"ONLINE", area?, budget, days, note? } → { request, notified } */
export async function POST(req: Request) {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail("bad", 400);
  const r = clean(body);
  if ("error" in r) return fail(r.error, 400);
  if ((await openCount(m.email)) >= MAX_OPEN) return fail("limit", 409);
  const made = await postRequest(m.email, await displayName(m.email), r).catch(() => null);
  return made ? json({ request: pubRequest(made), notified: made.notified }) : fail("db", 500);
}
