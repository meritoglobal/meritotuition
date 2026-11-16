import { CLASS_LEVELS, SUBJECTS } from "@mastermoshai/core";
import { fail, json } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { ask, AI_DAILY, AI_LIVE, DOUBT_PRICE, MAX_IMAGE, myDoubts, usedToday } from "@/lib/growth/ask";
import { me } from "@/lib/growth/people";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET → { questions, aiLeftToday, price } */
export async function GET() {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  const [list, used] = await Promise.all([myDoubts(m.email), usedToday(m.email)]);
  return json({ questions: list, aiLive: AI_LIVE, aiLeftToday: Math.max(0, AI_DAILY - used), tutorPrice: DOUBT_PRICE });
}

/** POST multipart: image? (≤5 MB), text?, subject, level → { id, aiAnswer } */
export async function POST(req: Request) {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  const f = await req.formData().catch(() => null);
  if (!f) return fail("bad", 400);
  const image = f.get("image");
  const file = image instanceof File && image.size > 0 ? image : null;
  if (file && file.size > MAX_IMAGE) return fail("too-big", 413);
  const text = String(f.get("text") ?? "").trim().slice(0, 2000);
  if (!file && !text) return fail("empty", 400);
  const subject = SUBJECTS.find((s) => s === f.get("subject")) ?? "Math";
  const level = CLASS_LEVELS.find((l) => l === f.get("level")) ?? "CLASS_9_10";
  const d = await ask({ email: m.email, subject, level, text, image: file }).catch((e) => { console.error("[ask]", e); return null; });
  return d ? json({ id: d.id, aiAnswer: d.ai_answer }) : fail("db", 500);
}
