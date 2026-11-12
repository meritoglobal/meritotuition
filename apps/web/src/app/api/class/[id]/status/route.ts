import { NextResponse } from "next/server";
import { classAccess, denied } from "@/lib/class-access";
import { safeClassId } from "@/lib/data";
import { LK_LIVE, teacherPresent } from "@/lib/livekit";

export const dynamic = "force-dynamic";

/** GET /api/class/:id/status → { teacherLive } for the waiting room. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = safeClassId((await ctx.params).id);
  const v = await classAccess(req, id);
  if (denied(v)) return NextResponse.json({ error: v.error }, { status: v.error === "login" ? 401 : 403 });
  if (!LK_LIVE) return NextResponse.json({ error: "demo" }, { status: 503 });
  return NextResponse.json({ teacherLive: await teacherPresent(id) }, { headers: { "cache-control": "no-store" } });
}
