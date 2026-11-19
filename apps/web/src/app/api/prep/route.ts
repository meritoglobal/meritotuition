import { CLASS_LEVELS, SUBJECTS } from "@mastermoshai/core";
import { fail, json } from "@/lib/api";
import { CONTENT } from "@/lib/content-catalog";
import { me } from "@/lib/growth/people";

export const dynamic = "force-dynamic";

/**
 * GET ?level=CLASS_9_10&subject=Physics → { sheets: [{ id, chapter, title, href, topics: [{ no, title }] }] }
 * Open topic i at `${href}` and scroll to its i-th `.part-head`, or use the web page /teach/prep/{id}?t={i}.
 */
export async function GET(req: Request) {
  if (!(await me())) return fail("login", 401);
  const sp = new URL(req.url).searchParams;
  const level = CLASS_LEVELS.find((l) => l === sp.get("level"));
  const subject = SUBJECTS.find((s) => s === sp.get("subject"));
  const sheets = CONTENT.filter((c) => c.kind === "sheet" && (!level || c.level === level) && (!subject || c.subject === subject))
    .sort((a, b) => a.chapter - b.chapter)
    .map((c) => ({ id: c.id, subject: c.subject, level: c.level, chapter: c.chapter, title: c.title, href: c.href, topics: c.topics ?? [] }));
  return json({ sheets });
}
