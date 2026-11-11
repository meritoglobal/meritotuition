import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth/session";
import { LK_LIVE, teacherPresent } from "@/lib/livekit";

export const dynamic = "force-dynamic";

/** GET /api/class/:id/status → { teacherLive } for the waiting room. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getUser())) return NextResponse.json({ error: "login" }, { status: 401 });
  if (!LK_LIVE) return NextResponse.json({ error: "demo" }, { status: 503 });
  const { id } = await ctx.params;
  return NextResponse.json({ teacherLive: await teacherPresent(id) }, { headers: { "cache-control": "no-store" } });
}
