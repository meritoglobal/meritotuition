import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase for class files, recordings and exams. Uses the secret
 * key, so it must never be imported by client code. Separate from login: these
 * env vars do not switch on Supabase auth (that is NEXT_PUBLIC_SUPABASE_*).
 */
const URL_ = (process.env.SUPABASE_URL ?? "").trim().replace(/\/$/, "");
const SECRET = (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

export const DATA_LIVE = Boolean(URL_ && SECRET);
export const BUCKET = "class-files";

let client: SupabaseClient | null = null;
export function db(): SupabaseClient {
  if (!DATA_LIVE) throw new Error("data-off");
  client ??= createClient(URL_, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

/** S3 settings for LiveKit to drop recordings straight into the same bucket. */
export function s3Target() {
  const accessKey = (process.env.SUPABASE_S3_KEY_ID ?? "").trim();
  const secret = (process.env.SUPABASE_S3_SECRET ?? "").trim();
  const region = (process.env.SUPABASE_S3_REGION ?? "").trim();
  if (!URL_ || !accessKey || !secret || !region) return null;
  return { accessKey, secret, region, endpoint: `${URL_}/storage/v1/s3`, bucket: BUCKET };
}

export const safeClassId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
