import { fail, json } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { children, reportText, useGuardianCode, weeklyReport } from "@/lib/growth/parent";
import { me, weekStart } from "@/lib/growth/people";

export const dynamic = "force-dynamic";

/** GET ?week=YYYY-MM-DD → { children: [{ email, name, weeklyEmail, report, text }] } (week defaults to this one). */
export async function GET(req: Request) {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  const w = new URL(req.url).searchParams.get("week");
  const week = w && /^\d{4}-\d{2}-\d{2}$/.test(w) ? weekStart(new Date(`${w}T12:00:00+06:00`)) : weekStart();
  const kids = await children(m.email);
  const out = await Promise.all(kids.map(async (k) => {
    const r = await weeklyReport(k.student_email, k.student_id, week);
    const name = k.student_name || k.student_email.split("@")[0]!;
    return { email: k.student_email, name, weeklyEmail: k.weekly_email, report: r, text: reportText(r, name) };
  }));
  return json({ week, children: out });
}

/** POST { code, name? } → link a child with the code from their account. */
export async function POST(req: Request) {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  const b = (await req.json().catch(() => ({}))) as { code?: string; name?: string };
  const r = await useGuardianCode(m.email, String(b.code ?? ""), String(b.name ?? "").slice(0, 60));
  return r.ok ? json({ student: r.student }) : fail(r.error, 400);
}
