/**
 * Live classroom tokens. With LiveKit keys set we mint real JWTs; without them
 * we return a demo token so the apps can be developed offline.
 */
import { AccessToken } from "livekit-server-sdk";

export interface RoomGrant {
  url: string;
  token: string;
  room: string;
  demo: boolean;
}

export async function roomToken(params: { room: string; identity: string; name: string; isTeacher: boolean }): Promise<RoomGrant> {
  const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = process.env;
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return { url: "wss://demo.livekit.invalid", token: `demo-${params.identity}-${params.room}`, room: params.room, demo: true };
  }
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity: params.identity, name: params.name, ttl: "3h" });
  at.addGrant({
    room: params.room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    // Only the teacher can admit from the waiting room / mute others.
    roomAdmin: params.isTeacher,
    canPublishData: true,
  });
  return { url: LIVEKIT_URL, token: await at.toJwt(), room: params.room, demo: false };
}
