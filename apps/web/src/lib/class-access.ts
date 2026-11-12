import "server-only";
import { getUser, type SessionUser } from "@/lib/auth/session";
import { DATA_LIVE, db } from "@/lib/data";

export type ClassRole = "teacher" | "student";

export interface ClassViewer { user: SessionUser; role: ClassRole; name: string }
export type Access = ClassViewer | { error: "login" | "forbidden" };

export const nameOf = (u: SessionUser) => (u.email?.split("@")[0] ?? u.phone ?? "Student").slice(0, 40);

/**
 * Who is this user in this class?
 * - A class that belongs to a batch: the batch's tutor is the teacher, students
 *   on the batch list are students, everyone else is turned away.
 * - Any other class id (the demo rooms): `?as=teacher` picks the role.
 */
export async function roleIn(classId: string, user: SessionUser, asParam: string | null): Promise<ClassRole | null> {
  if (DATA_LIVE) {
    const { data: b } = await db().from("batches").select("id,teacher_id").eq("class_id", classId).maybeSingle();
    if (b) {
      if (b.teacher_id === user.id) return "teacher";
      if (!user.email) return null;
      const { data: s } = await db().from("batch_students").select("email").eq("batch_id", b.id).eq("email", user.email.toLowerCase()).maybeSingle();
      return s ? "student" : null;
    }
  }
  return asParam === "teacher" ? "teacher" : "student";
}

export async function classAccess(req: Request, classId: string): Promise<Access> {
  const user = await getUser();
  if (!user) return { error: "login" };
  const role = await roleIn(classId, user, new URL(req.url).searchParams.get("as"));
  if (!role) return { error: "forbidden" };
  return { user, role, name: nameOf(user) };
}

export const denied = (a: Access): a is { error: "login" | "forbidden" } => "error" in a;
