import "server-only";
import { AwsClient } from "aws4fetch";

/**
 * Cloudflare R2 (S3-compatible) for class recordings. Recordings are kept for
 * 72 hours: a bucket lifecycle rule deletes them, and the listing hides
 * anything older in case the rule runs late. Downloads from R2 are free.
 *
 * Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.
 */
const ACC = process.env.R2_ACCOUNT_ID?.trim();
const KEY = process.env.R2_ACCESS_KEY_ID?.trim();
const SECRET = process.env.R2_SECRET_ACCESS_KEY?.trim();
const BUCKET = process.env.R2_BUCKET?.trim();

export const R2_LIVE = Boolean(ACC && KEY && SECRET && BUCKET);
export const KEEP_HOURS = 72;

const base = () => `https://${ACC}.r2.cloudflarestorage.com/${BUCKET}`;
let client: AwsClient | null = null;
const aws = () => (client ??= new AwsClient({ accessKeyId: KEY!, secretAccessKey: SECRET!, service: "s3", region: "auto" }));

const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1] ?? "";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const keyPath = (key: string) => key.split("/").map(encodeURIComponent).join("/");

export const recPrefix = (classId: string) => `rec/${classId}/`;

async function presign(url: string, method: string, expires = 3600) {
  const u = new URL(url);
  u.searchParams.set("X-Amz-Expires", String(expires));
  const r = await aws().sign(u.toString(), { method, aws: { signQuery: true } });
  return r.url;
}

export async function createUpload(key: string, contentType: string): Promise<string> {
  const r = await aws().fetch(`${base()}/${keyPath(key)}?uploads`, { method: "POST", headers: { "content-type": contentType } });
  if (!r.ok) throw new Error(`r2 create ${r.status}`);
  return tag(await r.text(), "UploadId");
}

export const partUrl = (key: string, uploadId: string, n: number) =>
  presign(`${base()}/${keyPath(key)}?partNumber=${n}&uploadId=${encodeURIComponent(uploadId)}`, "PUT");

export async function completeUpload(key: string, uploadId: string, parts: { n: number; etag: string }[]) {
  const body = `<CompleteMultipartUpload>${parts
    .sort((a, b) => a.n - b.n)
    .map((p) => `<Part><PartNumber>${p.n}</PartNumber><ETag>${esc(p.etag)}</ETag></Part>`)
    .join("")}</CompleteMultipartUpload>`;
  const r = await aws().fetch(`${base()}/${keyPath(key)}?uploadId=${encodeURIComponent(uploadId)}`, { method: "POST", body, headers: { "content-type": "application/xml" } });
  const text = await r.text();
  if (!r.ok || text.includes("<Error>")) throw new Error(`r2 complete ${r.status}`);
}

export interface R2Rec { key: string; at: string; size: number; url: string; download: string; expiresAt: string }

/** Recordings of a class still inside the 72-hour window, newest first, with 1-hour links. */
export async function listRecordings(classId: string): Promise<R2Rec[]> {
  const r = await aws().fetch(`${base()}?list-type=2&prefix=${encodeURIComponent(recPrefix(classId))}`);
  if (!r.ok) return [];
  const xml = await r.text();
  const items = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].map((m) => ({
    key: tag(m[1]!, "Key"), at: tag(m[1]!, "LastModified"), size: Number(tag(m[1]!, "Size")) || 0,
  }));
  const fresh = items.filter((i) => i.size > 0 && Date.now() - Date.parse(i.at) < KEEP_HOURS * 3600e3);
  fresh.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return Promise.all(fresh.map(async (i) => {
    const name = i.key.split("/").pop()!;
    const u = `${base()}/${keyPath(i.key)}`;
    return {
      ...i,
      url: await presign(u, "GET"),
      download: await presign(`${u}?response-content-disposition=${encodeURIComponent(`attachment; filename="${name}"`)}`, "GET"),
      expiresAt: new Date(Date.parse(i.at) + KEEP_HOURS * 3600e3).toISOString(),
    };
  }));
}
