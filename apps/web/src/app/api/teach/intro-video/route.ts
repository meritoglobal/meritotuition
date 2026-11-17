import { fail, json } from "@/lib/api";
import { getProfile } from "@/lib/batches";
import { DATA_LIVE } from "@/lib/data";
import { MAX_VIDEO_MB, UPLOADS_ON, VIDEO_TYPES, finishUpload, myVideo, removeVideo, setYouTube, startUpload } from "@/lib/growth/intro-video";
import { me } from "@/lib/growth/people";

export const dynamic = "force-dynamic";

async function tutor() {
  const m = await me();
  if (!m) return { err: fail("login", 401) };
  if (!DATA_LIVE) return { err: fail("data-off", 503) };
  if (!(await getProfile(m.user.id))) return { err: fail("no-profile", 403) };
  return { id: m.user.id };
}

/** GET → { video: IntroVideo | null, uploads, maxMb, types } */
export async function GET() {
  const { id, err } = await tutor();
  if (err) return err;
  return json({ video: await myVideo(id), uploads: UPLOADS_ON, maxMb: MAX_VIDEO_MB, types: Object.keys(VIDEO_TYPES) });
}

/**
 * POST one of:
 *   { youtube: "https://youtu.be/…", vertical? }            → { video }
 *   { upload: { type: "video/mp4", size: bytes } }           → { key, putUrl }  then PUT the file to putUrl with content-type = type
 *   { finish: key, vertical? }                               → { video }
 */
export async function POST(req: Request) {
  const { id, err } = await tutor();
  if (err) return err;
  const b = (await req.json().catch(() => ({}))) as { youtube?: unknown; upload?: { type?: unknown; size?: unknown }; finish?: unknown; vertical?: unknown };
  const vertical = b.vertical === true;
  if (typeof b.youtube === "string") {
    const r = await setYouTube(id, b.youtube, vertical);
    return r === "ok" ? json({ video: await myVideo(id) }) : fail(r, r === "db" ? 500 : 400);
  }
  if (b.upload) {
    const r = await startUpload(id, String(b.upload.type ?? ""), Number(b.upload.size));
    return "error" in r ? fail(r.error, r.error === "uploads-off" ? 503 : 400) : json(r);
  }
  if (typeof b.finish === "string") {
    const r = await finishUpload(id, b.finish, vertical);
    return r === "ok" ? json({ video: await myVideo(id) }) : fail(r, r === "db" ? 500 : 400);
  }
  return fail("bad", 400);
}

/** DELETE → { ok }: remove the intro video (profile goes back to the no-video layout). */
export async function DELETE() {
  const { id, err } = await tutor();
  if (err) return err;
  return json({ ok: await removeVideo(id) });
}
