import "server-only";
import { getUser, type SessionUser } from "@/lib/auth/session";

export type ClassRole = "teacher" | "student";

export interface ClassViewer { user: SessionUser; role: ClassRole; name: string }

/**
 * Who is looking at this class, and as what.
 * TODO(db): read the tutor and enrolled students from the class record. Until
 * classes live in the database, `?as=teacher` picks the role (demo only), the
 * same rule the LiveKit token route uses.
 */
export async function classViewer(req: Request): Promise<ClassViewer | null> {
  const user = await getUser();
  if (!user) return null;
  const role: ClassRole = new URL(req.url).searchParams.get("as") === "teacher" ? "teacher" : "student";
  const name = (user.email?.split("@")[0] ?? user.phone ?? "Student").slice(0, 40);
  return { user, role, name };
}
