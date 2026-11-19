import "server-only";
import { SUBJECT_GROUP, contentAccess, segmentOfContent, type Access, type AccessContext, type ClassSegment, type ContentSegment, type Group } from "@mastermoshai/core";
import { studentBatches } from "@/lib/batches";
import { CONTENT, type ContentItem } from "@/lib/content-catalog";
import { DATA_LIVE, db } from "@/lib/data";
import { isAdmin } from "@/lib/growth/people";

/** Everything that decides what this person can open. Tutors (found by login id or profile email) must be ID-verified. */
export async function accessContext(m: { email: string; user?: { id: string }; admin?: boolean }): Promise<AccessContext> {
  if (m.admin || isAdmin(m.email)) return { staff: true, segments: [], batches: [] };
  // Without a database (demo site) there is nothing to check against: show everything.
  if (!DATA_LIVE) return { staff: true, segments: [], batches: [] };
  const s = db();
  const prof = s.from("teacher_profiles").select("user_id,verified").limit(1);
  const [{ data: profs }, { data: subs }, { data: lock }, batches] = await Promise.all([
    m.user ? prof.or(`user_id.eq."${m.user.id.replace(/["\\]/g, "")}",email.eq."${m.email.replace(/["\\]/g, "")}"`) : prof.eq("email", m.email),
    s.from("content_subscriptions").select("segment").eq("student_email", m.email).eq("status", "ACTIVE").gt("current_period_end", new Date().toISOString()),
    s.from("student_segments").select("segment").eq("email", m.email).maybeSingle(),
    studentBatches(m.email).catch(() => []),
  ]);
  // Only batches of verified tutors unlock content (a self-made "tutor" can't unlock it for themselves).
  const tids = [...new Set(batches.map((b) => b.teacher_id))];
  const { data: ok } = tids.length ? await s.from("teacher_profiles").select("user_id").in("user_id", tids).eq("verified", true) : { data: [] };
  const verified = new Set((ok ?? []).map((r) => r.user_id));
  return {
    staff: Boolean(profs?.[0]?.verified),
    // A pack opens only the student's own (locked) class.
    segments: [...new Set((subs ?? []).map((r) => r.segment as ContentSegment))].filter((x) => !lock?.segment || x === lock.segment),
    batches: batches.filter((b) => verified.has(b.teacher_id)).map((b) => ({ subject: b.subject, level: b.level, teacherName: b.teacher_name })),
  };
}

export interface CatalogEntry {
  id: string; kind: ContentItem["kind"]; subject: string; level: string; segment: ClassSegment | null; group: Group | null; chapter: number;
  title: ContentItem["title"]; href: string; topics: { no: string; title: string }[]; access: Access;
}

/** Content of a class; with a group, its common subjects plus that group's own. */
export function catalog(ctx: AccessContext, f: { segment?: string; group?: string; subject?: string } = {}): CatalogEntry[] {
  return CONTENT.map((c) => ({ c, seg: segmentOfContent(c) }))
    .filter(({ c, seg }) => (!f.segment || seg === f.segment) && (!f.subject || c.subject === f.subject) && (!f.group || !SUBJECT_GROUP[c.subject] || SUBJECT_GROUP[c.subject] === f.group))
    .sort((a, b) => a.c.subject.localeCompare(b.c.subject) || a.c.chapter - b.c.chapter)
    .map(({ c, seg }) => ({
      id: c.id, kind: c.kind, subject: c.subject, level: c.level, segment: seg, group: SUBJECT_GROUP[c.subject] ?? null, chapter: c.chapter, title: c.title,
      href: c.href, topics: c.topics ?? [], access: contentAccess(c, ctx),
    }));
}

/** Model tests and other platform exams: same rule as lecture sheets. */
export function examAccess(ctx: AccessContext, t: { subject: string; level: string }): Access {
  return contentAccess(t, ctx);
}
