import "server-only";
import { db } from "@/lib/data";
import { R2_LIVE, getUrl, headSize, introKey, putUrl, removeObject } from "@/lib/r2";

/**
 * A tutor's optional intro video: a YouTube link, or a file uploaded straight
 * from the browser/app to R2 (intro/…, kept; not under the rec/ 72-hour rule).
 * No video means no video section at all on the profile.
 */
export const MAX_VIDEO_MB = 200;
export const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
export const UPLOADS_ON = R2_LIVE;

export interface IntroVideo { kind: "YOUTUBE" | "FILE"; vertical: boolean; youtubeId?: string; embed?: string; src?: string }
interface Row { user_id: string; intro_video_kind: "YOUTUBE" | "FILE" | null; intro_video_ref: string | null; intro_video_vertical: boolean | null }

/** youtube.com/watch?v=…, youtu.be/…, /shorts/…, /embed/… → the 11-character id. */
export function youtubeId(raw: string): string | null {
  const s = raw.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  let u: URL;
  try { u = new URL(s.startsWith("http") ? s : `https://${s}`); } catch { return null; }
  const host = u.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = u.searchParams.get("v") ?? (/^\/(shorts|embed|live|v)\/([\w-]{11})/.exec(u.pathname)?.[2] ?? null);
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

async function row(userId: string): Promise<Row | null> {
  const { data } = await db().from("teacher_profiles").select("user_id,intro_video_kind,intro_video_ref,intro_video_vertical").eq("user_id", userId).maybeSingle();
  return (data as Row) ?? null;
}

/** What a profile page or the app shows; null when the tutor has no video. */
export function videoOf(r: Pick<Row, "user_id" | "intro_video_kind" | "intro_video_ref" | "intro_video_vertical">): IntroVideo | null {
  if (!r.intro_video_kind || !r.intro_video_ref) return null;
  const vertical = Boolean(r.intro_video_vertical);
  if (r.intro_video_kind === "YOUTUBE") return { kind: "YOUTUBE", vertical, youtubeId: r.intro_video_ref, embed: `https://www.youtube-nocookie.com/embed/${r.intro_video_ref}?rel=0` };
  if (!R2_LIVE) return null;
  return { kind: "FILE", vertical, src: `/api/tutors/${encodeURIComponent(r.user_id)}/video` };
}

export async function myVideo(userId: string): Promise<IntroVideo | null> {
  const r = await row(userId);
  return r ? videoOf(r) : null;
}

async function save(userId: string, kind: Row["intro_video_kind"], ref: string | null, vertical: boolean) {
  const old = await row(userId);
  const { error } = await db().from("teacher_profiles").update({ intro_video_kind: kind, intro_video_ref: ref, intro_video_vertical: vertical, updated_at: new Date().toISOString() }).eq("user_id", userId);
  if (error) return false;
  if (old?.intro_video_kind === "FILE" && old.intro_video_ref && old.intro_video_ref !== ref) await removeObject(old.intro_video_ref);
  return true;
}

export async function setYouTube(userId: string, link: string, vertical: boolean): Promise<"ok" | "bad-link" | "db"> {
  const id = youtubeId(link);
  if (!id) return "bad-link";
  const isShort = /\/shorts\//.test(link);
  return (await save(userId, "YOUTUBE", id, vertical || isShort)) ? "ok" : "db";
}

/** Step 1 of an upload: a presigned PUT URL for the browser/app to send the file to. */
export async function startUpload(userId: string, type: string, sizeBytes: number): Promise<{ key: string; putUrl: string } | { error: string }> {
  if (!R2_LIVE) return { error: "uploads-off" };
  const ext = VIDEO_TYPES[type];
  if (!ext) return { error: "type" };
  if (!(sizeBytes > 0 && sizeBytes <= MAX_VIDEO_MB * 1024 * 1024)) return { error: "size" };
  const key = introKey(userId, ext);
  return { key, putUrl: await putUrl(key) };
}

/** Step 2: the file is in R2; make it the tutor's video. */
export async function finishUpload(userId: string, key: string, vertical: boolean): Promise<"ok" | "bad" | "size" | "db"> {
  const mine = `intro/${userId.replace(/[^\w-]/g, "_")}/`;
  if (!key.startsWith(mine) || key.includes("..")) return "bad";
  const size = await headSize(key);
  if (size === null) return "bad";
  if (size > MAX_VIDEO_MB * 1024 * 1024) { await removeObject(key); return "size"; }
  return (await save(userId, "FILE", key, vertical)) ? "ok" : "db";
}

export const removeVideo = (userId: string) => save(userId, null, null, false);

/** A short-lived link to the uploaded file, for /api/tutors/[id]/video. */
export async function fileUrl(userId: string): Promise<string | null> {
  const r = await row(userId);
  if (!R2_LIVE || r?.intro_video_kind !== "FILE" || !r.intro_video_ref) return null;
  return getUrl(r.intro_video_ref, 3600);
}
