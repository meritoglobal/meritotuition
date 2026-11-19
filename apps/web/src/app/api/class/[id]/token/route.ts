import { NextResponse, type NextRequest } from "next/server";
import { classAccess, denied } from "@/lib/class-access";
import { DATA_LIVE, db, safeClassId } from "@/lib/data";
import { dhakaDay, keyOf } from "@/lib/growth/people";
import { recordSession } from "@/lib/biz/earnings";
import { LK_LIVE, LK_URL, classToken } from "@/lib/livekit";

export const dynamic = "force-dynamic";

/** POST /api/class/:id/token → { url, token }. Role comes from the batch (tutor or enrolled student). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = safeClassId((await ctx.params).id);
  const v = await classAccess(req, id);
  if (denied(v)) return NextResponse.json({ error: v.error }, { status: v.error === "login" ? 401 : 403 });
  if (!LK_LIVE) return NextResponse.json({ error: "demo" }, { status: 503 });
  // Attendance for the weekly parent report: one row per student per class day.
  if (v.role === "student" && DATA_LIVE) {
    await db().from("class_attendance").upsert({ class_id: id, email: keyOf(v.user), day: dhakaDay() }, { onConflict: "class_id,email,day", ignoreDuplicates: true }).then(() => null, () => null);
  }
  // The tutor opened the room: this class counts as held (paid per class once a student joins).
  if (v.role === "teacher" && DATA_LIVE) await recordSession(id, v.user.id).catch(() => null);
  const token = await classToken({ classId: id, identity: `${v.role}:${v.user.id}`, name: v.name, role: v.role });
  return NextResponse.json({ url: LK_URL, token }, { headers: { "cache-control": "no-store" } });
}
