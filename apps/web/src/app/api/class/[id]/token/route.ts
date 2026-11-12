import { NextResponse, type NextRequest } from "next/server";
import { classAccess, denied } from "@/lib/class-access";
import { safeClassId } from "@/lib/data";
import { LK_LIVE, LK_URL, classToken } from "@/lib/livekit";

export const dynamic = "force-dynamic";

/** POST /api/class/:id/token → { url, token }. Role comes from the batch (tutor or enrolled student). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = safeClassId((await ctx.params).id);
  const v = await classAccess(req, id);
  if (denied(v)) return NextResponse.json({ error: v.error }, { status: v.error === "login" ? 401 : 403 });
  if (!LK_LIVE) return NextResponse.json({ error: "demo" }, { status: 503 });
  const token = await classToken({ classId: id, identity: `${v.role}:${v.user.id}`, name: v.name, role: v.role });
  return NextResponse.json({ url: LK_URL, token }, { headers: { "cache-control": "no-store" } });
}
