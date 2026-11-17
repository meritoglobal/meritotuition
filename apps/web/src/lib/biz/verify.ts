import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { BUCKET, DATA_LIVE, db } from "@/lib/data";
import { notify } from "@/lib/growth/notify";

/**
 * Tutor verification (students are never verified). Anyone from a Class 8 pass to a
 * graduate can teach: they upload a school (Class 9+), college or university student ID,
 * or their national ID card (NID), front and back. The AI reads it and checks it looks like a real,
 * current student ID that matches the tutor's profile name. A clear match is approved
 * at once; anything doubtful goes to an admin. Only verified tutors get the platform's
 * lecture sheets and exams.
 */

export const AI_VERIFY_LIVE = Boolean(process.env.ANTHROPIC_API_KEY);
const MODEL = process.env.VERIFY_MODEL ?? "claude-opus-5-5";
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];
export const MAX_ID_IMAGE = 6 * 1024 * 1024;

export type VerifyStatus = "NONE" | "PENDING" | "REVIEW" | "APPROVED" | "REJECTED";

export interface AiIdCheck {
  is_student_id: boolean; // true for any accepted document (kept for older rows)
  doc_type: "SCHOOL_ID" | "COLLEGE_ID" | "UNIVERSITY_ID" | "NID" | "OTHER";
  school_class: number | null; // for a school ID, the class printed on it
  institution: string | null;
  name_on_card: string | null;
  id_number: string | null;
  valid_until: string | null;
  looks_edited: boolean;
  name_matches: boolean;
  confidence: number; // 0..1
  reason: string;
}

export interface Verification {
  user_id: string; email: string | null; profile_name: string | null; front_path: string; back_path: string | null;
  status: VerifyStatus; ai: AiIdCheck | null; note: string | null; submitted_at: string; decided_at: string | null;
}

export async function myVerification(userId: string): Promise<Verification | null> {
  if (!DATA_LIVE) return null;
  const { data } = await db().from("tutor_verifications").select("*").eq("user_id", userId).maybeSingle();
  return (data as Verification) ?? null;
}

export async function isVerifiedTutor(userId: string): Promise<boolean> {
  if (!DATA_LIVE) return true; // demo site
  const { data } = await db().from("teacher_profiles").select("verified").eq("user_id", userId).maybeSingle();
  return Boolean(data?.verified);
}

async function save(path: string, f: File): Promise<{ type: ImageType; b64: string } | null> {
  const type = IMAGE_TYPES.find((t) => t === f.type);
  if (!type || f.size <= 0 || f.size > MAX_ID_IMAGE) return null;
  const buf = Buffer.from(await f.arrayBuffer());
  const up = await db().storage.from(BUCKET).upload(`${path}.${type.split("/")[1]}`, buf, { contentType: type, upsert: true });
  if (up.error) return null;
  return { type, b64: buf.toString("base64") };
}

export type SubmitError = "image" | "profile" | "db";

export async function submitId(o: { userId: string; email: string; front: File; back?: File | null }): Promise<{ status: VerifyStatus } | { error: SubmitError }> {
  const s = db();
  const { data: prof } = await s.from("teacher_profiles").select("name,university").eq("user_id", o.userId).maybeSingle();
  if (!prof) return { error: "profile" };
  const base = `tutor-ids/${o.userId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const front = await save(`${base}/front`, o.front);
  if (!front) return { error: "image" };
  const back = o.back && o.back.size > 0 ? await save(`${base}/back`, o.back) : null;
  const ext = (t: ImageType) => t.split("/")[1];
  const row = {
    user_id: o.userId, email: o.email, profile_name: prof.name, front_path: `${base}/front.${ext(front.type)}`, back_path: back ? `${base}/back.${ext(back.type)}` : null,
    status: "PENDING" as VerifyStatus, ai: null, note: null, submitted_at: new Date().toISOString(), decided_at: null,
  };
  const { error } = await s.from("tutor_verifications").upsert(row, { onConflict: "user_id" });
  if (error) return { error: "db" };
  await s.from("teacher_profiles").update({ verified: false }).eq("user_id", o.userId);

  let ai: AiIdCheck | null = null;
  if (AI_VERIFY_LIVE) ai = await scanId(prof.name, prof.university, [front, ...(back ? [back] : [])]).catch((e) => { console.error("[verify:ai]", e); return null; });
  // Auto-approve only a clear, current, unedited student ID whose name matches the profile.
  const eligible = ai && ai.doc_type !== "OTHER" && (ai.doc_type !== "SCHOOL_ID" || (ai.school_class ?? 0) >= 9);
  const pass = ai && eligible && ai.is_student_id && ai.name_matches && !ai.looks_edited && ai.confidence >= 0.85 && (ai.doc_type === "NID" || !expired(ai.valid_until));
  const status: VerifyStatus = pass ? "APPROVED" : ai && (!ai.is_student_id || ai.confidence < 0.3) ? "REJECTED" : "REVIEW";
  await decide(o.userId, status, ai, null);
  return { status };
}

function expired(d: string | null): boolean {
  if (!d) return false;
  const t = new Date(d);
  return !Number.isNaN(t.getTime()) && t.getTime() < Date.now();
}

export async function decide(userId: string, status: VerifyStatus, ai: AiIdCheck | null, note: string | null) {
  const s = db();
  const { data: v } = await s.from("tutor_verifications").update({ status, ...(ai ? { ai } : {}), note, decided_at: status === "REVIEW" ? null : new Date().toISOString() })
    .eq("user_id", userId).select("email").maybeSingle();
  await s.from("teacher_profiles").update({ verified: status === "APPROVED" }).eq("user_id", userId);
  if (!v?.email) return;
  if (status === "APPROVED") await notify({ email: v.email, kind: "VERIFIED", mail: true, title: "আপনার আইডি যাচাই হয়ে গেছে ✓", body: "সব লেকচার শিট, পরীক্ষা আর ক্লাস প্রস্তুতি এখন খোলা।", path: "/teach" });
  if (status === "REJECTED") await notify({ email: v.email, kind: "VERIFY_REJECTED", mail: true, title: "আইডিটা মেলানো গেল না", body: note ?? "পরিষ্কার ছবিতে আবার স্টুডেন্ট আইডি বা NID দিন। প্রোফাইলের নাম আর কার্ডের নাম যেন এক হয়।", path: "/teach/verify" });
}

export async function idImageUrls(v: Verification): Promise<string[]> {
  const out: string[] = [];
  for (const p of [v.front_path, v.back_path].filter(Boolean) as string[]) {
    const { data } = await db().storage.from(BUCKET).createSignedUrl(p, 600);
    if (data?.signedUrl) out.push(data.signedUrl);
  }
  return out;
}

const SYSTEM = `You check identity documents for Mastermoshai, a tutoring platform in Bangladesh. Anyone who has passed Class 8 (so a school student in Class 9 or above), a college or university student, or a graduate may become a tutor.
You receive photos of one document (front, and maybe back) and the name the tutor gave in their profile.
Accepted documents: a school student ID showing Class 9 or above, a college student ID, a university/medical/engineering college student ID, or a Bangladesh national ID card (NID, old or smart card).
Decide carefully and conservatively. Report:
- doc_type: SCHOOL_ID, COLLEGE_ID, UNIVERSITY_ID, NID or OTHER
- school_class: for a school ID, the class printed on it (number), else null
- is_student_id: true only if this is a genuine-looking accepted document (a school ID must show Class 9 or above; a printout of a website, a screenshot or a photo of a screen is not accepted)
- institution, name_on_card, id_number, valid_until (YYYY-MM-DD if a validity/expiry date is printed, else null)
- looks_edited: any sign of digital editing, pasted text or photo, mismatched fonts, or a photo of a screen
- name_matches: does the name on the card plausibly match the profile name (allow Bangla/English spelling variants, missing middle names, initials)?
- confidence: 0 to 1, how sure you are that this is a real, current student ID of the person named in the profile
- reason: one short sentence in Bangla for the admin.
Never guess text you cannot read; use null.`;

async function scanId(profileName: string, university: string | null, imgs: { type: ImageType; b64: string }[]): Promise<AiIdCheck> {
  const client = new Anthropic();
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM,
    tools: [{
      name: "report",
      description: "Report the ID check result.",
      input_schema: {
        type: "object",
        properties: {
          is_student_id: { type: "boolean" }, doc_type: { type: "string", enum: ["SCHOOL_ID", "COLLEGE_ID", "UNIVERSITY_ID", "NID", "OTHER"] }, school_class: { type: ["integer", "null"] }, institution: { type: ["string", "null"] }, name_on_card: { type: ["string", "null"] },
          id_number: { type: ["string", "null"] }, valid_until: { type: ["string", "null"] }, looks_edited: { type: "boolean" },
          name_matches: { type: "boolean" }, confidence: { type: "number" }, reason: { type: "string" },
        },
        required: ["is_student_id", "doc_type", "school_class", "institution", "name_on_card", "id_number", "valid_until", "looks_edited", "name_matches", "confidence", "reason"],
      },
    }],
    tool_choice: { type: "tool", name: "report" },
    messages: [{
      role: "user",
      content: [
        ...imgs.map((i) => ({ type: "image" as const, source: { type: "base64" as const, media_type: i.type, data: i.b64 } })),
        { type: "text" as const, text: `Profile name: ${profileName}\nInstitution in profile: ${university ?? "(not given)"}` },
      ],
    }],
  });
  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("no-result");
  const r = block.input as AiIdCheck;
  return { ...r, confidence: Math.max(0, Math.min(1, Number(r.confidence) || 0)) };
}
