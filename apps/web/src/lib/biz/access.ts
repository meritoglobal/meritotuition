import "server-only";
import { contentAccess, segmentOfContent, type Access, type AccessContext, type ContentSegment } from "@mastermoshai/core";
import { studentBatches } from "@/lib/batches";
import { CONTENT, type ContentItem } from "@/lib/content-catalog";
import { DATA_LIVE, db } from "@/lib/data";
import { isAdmin } from "@/lib/growth/people";

/** Everything that decides what this person can open. Tutors are found by login id or profile email. */
export async function accessContext(m: { email: string; user?: { id: string }; admin?: boolean }): Promise<AccessContext> {
  if (m.admin || isAdmin(m.email)) return { staff: true, segments: [], batches: [] };
  // Without a database (demo site) there is nothing to check against: show everything.
  if (!DATA_LIVE) return { staff: true, segments: [], batches: [] };
  const s = db();
  const prof = s.from("teacher_profiles").select("user_id").limit(1);
  const [{ data: profs }, { data: subs }, batches] = await Promise.all([
    m.user ? prof.or(`user_id.eq."${m.user.id.replace(/["\\]/g, "")}",email.eq."${m.email.replace(/["\\]/g, "")}"`) : prof.eq("email", m.email),
    s.from("content_subscriptions").select("segment").eq("student_email", m.email).eq("status", "ACTIVE").gt("current_period_end", new Date().toISOString()),
    studentBatches(m.email).catch(() => []),
  ]);
  return {
    staff: Boolean(profs?.length),
    segments: [...new Set((subs ?? []).map((r) => r.segment as ContentSegment))],
    batches: batches.map((b) => ({ subject: b.subject, level: b.level, teacherName: b.teacher_name })),
  };
}

export interface CatalogEntry {
  id: string; kind: ContentItem["kind"]; subject: string; level: string; segment: ContentSegment | null; chapter: number;
  title: ContentItem["title"]; href: string; topics: { no: string; title: string }[]; access: Access;
}

export function catalog(ctx: AccessContext, f: { segment?: string; subject?: string } = {}): CatalogEntry[] {
  return CONTENT.map((c) => ({ c, seg: segmentOfContent(c) }))
    .filter(({ c, seg }) => (!f.segment || seg === f.segment) && (!f.subject || c.subject === f.subject))
    .sort((a, b) => a.c.subject.localeCompare(b.c.subject) || a.c.chapter - b.c.chapter)
    .map(({ c, seg }) => ({
      id: c.id, kind: c.kind, subject: c.subject, level: c.level, segment: seg, chapter: c.chapter, title: c.title,
      href: c.href, topics: c.topics ?? [], access: contentAccess(c, ctx),
    }));
}

/** Model tests and other platform exams: same rule as lecture sheets. */
export function examAccess(ctx: AccessContext, t: { subject: string; level: string }): Access {
  return contentAccess(t, ctx);
}
