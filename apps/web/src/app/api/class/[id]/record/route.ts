import { classAccess, denied } from "@/lib/class-access";
import { fail, json } from "@/lib/api";
import { safeClassId } from "@/lib/data";
import { startRecording } from "@/lib/livekit";

export const dynamic = "force-dynamic";

/** POST: the tutor's room calls this once connected; starts the class recording if it is not running. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = safeClassId((await ctx.params).id);
  const v = await classAccess(req, id);
  if (denied(v)) return fail(v.error, v.error === "login" ? 401 : 403);
  if (v.role !== "teacher") return fail("forbidden", 403);
  const state = await startRecording(safeClassId((await ctx.params).id));
  return json({ state });
}
