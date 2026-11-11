import { NextResponse } from "next/server";
import { LK_LIVE, webhookReceiver } from "@/lib/livekit";

export const dynamic = "force-dynamic";

/**
 * LiveKit → us: who joined/left which class and when. This is the attendance
 * ledger that escrow and refunds rely on. Signed by LiveKit; unsigned calls
 * are rejected. TODO(db): write to the Attendance table instead of the log.
 */
export async function POST(req: Request) {
  if (!LK_LIVE) return NextResponse.json({ ok: false }, { status: 503 });
  let ev;
  try {
    ev = await webhookReceiver().receive(await req.text(), req.headers.get("authorization") ?? undefined);
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (ev.event === "participant_joined" || ev.event === "participant_left" || ev.event === "room_finished") {
    console.log("[attendance]", JSON.stringify({
      event: ev.event,
      room: ev.room?.name,
      who: ev.participant?.identity,
      role: ev.participant?.attributes?.role,
      at: Number(ev.createdAt) * 1000,
    }));
  }
  return NextResponse.json({ ok: true });
}
