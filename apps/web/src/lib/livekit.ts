import "server-only";
import { AccessToken, RoomServiceClient, TrackSource, WebhookReceiver } from "livekit-server-sdk";

/**
 * LiveKit settings, read from server env (never NEXT_PUBLIC: the secret must
 * not reach the browser). Without all three the classroom runs as a demo.
 */
const URL_ = process.env.LIVEKIT_URL ?? "";
const KEY = process.env.LIVEKIT_API_KEY ?? "";
const SECRET = process.env.LIVEKIT_API_SECRET ?? "";

export const LK_LIVE = Boolean(URL_ && KEY && SECRET);
export const LK_URL = URL_;

export type ClassRole = "teacher" | "student";

export const roomName = (classId: string) => `mm-class-${classId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64)}`;

/** A short-lived ticket into one class room. Teachers get room admin and screen share. */
export async function classToken(o: { classId: string; identity: string; name: string; role: ClassRole }): Promise<string> {
  const at = new AccessToken(KEY, SECRET, {
    identity: o.identity,
    name: o.name,
    ttl: "3h",
    attributes: { role: o.role },
  });
  const teacher = o.role === "teacher";
  at.addGrant({
    room: roomName(o.classId),
    roomJoin: true,
    roomAdmin: teacher,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
    canPublishSources: teacher
      ? [TrackSource.CAMERA, TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO]
      : [TrackSource.CAMERA, TrackSource.MICROPHONE],
  });
  return at.toJwt();
}

const httpUrl = (u: string) => u.replace(/^ws(s?):\/\//, "http$1://");

/** Is a teacher in the room right now? Drives the waiting room. */
export async function teacherPresent(classId: string): Promise<boolean> {
  try {
    const svc = new RoomServiceClient(httpUrl(URL_), KEY, SECRET);
    const ps = await svc.listParticipants(roomName(classId));
    return ps.some((p) => p.attributes?.role === "teacher");
  } catch {
    return false; // room does not exist yet
  }
}

export const webhookReceiver = () => new WebhookReceiver(KEY, SECRET);
