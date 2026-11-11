import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/session";
import { LK_LIVE, LK_URL, classToken, type ClassRole } from "@/lib/livekit";

export const dynamic = "force-dynamic";

/**
 * POST /api/class/:id/token → { url, token } for the signed-in user.
 * TODO(db): read the role and enrolment from the class record. Until the
 * database is wired up, ?as=teacher picks the role (demo only).
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "login" }, { status: 401 });
  if (!LK_LIVE) return NextResponse.json({ error: "demo" }, { status: 503 });
  const { id } = await ctx.params;
  const role: ClassRole = req.nextUrl.searchParams.get("as") === "teacher" ? "teacher" : "student";
  const name = (user.email?.split("@")[0] ?? user.phone ?? "Student").slice(0, 40);
  const token = await classToken({ classId: id, identity: `${role}:${user.id}`, name, role });
  return NextResponse.json({ url: LK_URL, token }, { headers: { "cache-control": "no-store" } });
}
