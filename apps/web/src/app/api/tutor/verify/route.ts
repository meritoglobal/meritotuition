import { fail, json } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { myVerification, submitId } from "@/lib/biz/verify";
import { me } from "@/lib/growth/people";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET → { status: NONE|PENDING|REVIEW|APPROVED|REJECTED, note }
 * POST multipart: front (image, required), back (image, optional) → { status } after the AI check.
 */
export async function GET() {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  const v = await myVerification(m.user.id);
  return json({ status: v?.status ?? "NONE", note: v?.note ?? null });
}

export async function POST(req: Request) {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  const f = await req.formData().catch(() => null);
  const front = f?.get("front"), back = f?.get("back");
  if (!(front instanceof File)) return fail("image", 400);
  const r = await submitId({ userId: m.user.id, email: m.email, front, back: back instanceof File ? back : null });
  return "error" in r ? fail(r.error, 400) : json(r);
}
