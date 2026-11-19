import { fail, json } from "@/lib/api";
import { getProfile } from "@/lib/batches";
import { DATA_LIVE } from "@/lib/data";
import { isUuid, me } from "@/lib/growth/people";
import { bidsFor, getRequest, isLive, myBid, placeBid, toNumber, tutorMaySee, withdrawBid } from "@/lib/growth/requests";
import { pubBid } from "@/lib/growth/requests-api";

export const dynamic = "force-dynamic";

async function load(id: string) {
  const m = await me();
  if (!m) return { err: fail("login", 401) };
  if (!DATA_LIVE) return { err: fail("data-off", 503) };
  const r = isUuid(id) ? await getRequest(id) : null;
  if (!r) return { err: fail("not-found", 404) };
  return { m, r };
}

/** GET → owner: { bids: (Bid & { tutor })[] }; tutor: { myBid } */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { m, r, err } = await load((await params).id);
  if (err) return err;
  if (r.student_email === m.email) return json({ bids: (await bidsFor(r.id)).map(({ tutor, ...b }) => ({ ...pubBid(b), tutor })) });
  const t = await getProfile(m.user.id);
  if (!t || !(await tutorMaySee(r, t))) return fail("forbidden", 403);
  const b = await myBid(r.id, t.user_id);
  return json({ myBid: b ? pubBid(b) : null });
}

/** POST { price, message? } (tutor) → { bid }. Placing again updates the offer. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { m, r, err } = await load((await params).id);
  if (err) return err;
  const t = await getProfile(m.user.id);
  if (!t) return fail("no-profile", 403);
  if (!isLive(r)) return fail("closed", 409);
  if (!(await tutorMaySee(r, t))) return fail("forbidden", 403);
  const body = (await req.json().catch(() => ({}))) as { price?: unknown; message?: unknown };
  const price = toNumber(body.price);
  if (!(price >= 500 && price <= 100000)) return fail("price", 400);
  const b = await placeBid(r, t, price, typeof body.message === "string" ? body.message : "");
  return b ? json({ bid: pubBid(b) }) : fail("db", 500);
}

/** DELETE (tutor) → { ok }: withdraw a pending offer. */
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { m, r, err } = await load((await params).id);
  if (err) return err;
  return json({ ok: await withdrawBid(r, m.user.id) });
}
