import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { BUCKET, db } from "@/lib/data";
import { dhakaDay, isUuid } from "./people";
import { notify } from "./notify";
import { startPayment } from "./pay";

export const AI_LIVE = Boolean(process.env.ANTHROPIC_API_KEY);
export const AI_DAILY = Number(process.env.AI_DAILY_LIMIT ?? 10);
export const DOUBT_PRICE = Number(process.env.DOUBT_PRICE ?? 30);
export const DOUBT_TUTOR_SHARE = 0.7;

export interface Doubt {
  id: string; asker_email: string; subject: string; level: string; text: string | null; image_path: string | null;
  ai_answer: string | null; status: "AI" | "WAITING_PAYMENT" | "OPEN" | "CLAIMED" | "ANSWERED";
  tutor_email: string | null; tutor_name: string | null; tutor_answer: string | null; price: number | null;
  claimed_at: string | null; answered_at: string | null; created_at: string;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];
export const MAX_IMAGE = 5 * 1024 * 1024;

export async function usedToday(email: string): Promise<number> {
  const since = new Date(`${dhakaDay()}T00:00:00+06:00`).toISOString();
  const { count } = await db().from("doubts").select("id", { count: "exact", head: true }).eq("asker_email", email).gte("created_at", since).not("ai_answer", "is", null);
  return count ?? 0;
}

export async function myDoubts(email: string): Promise<Doubt[]> {
  const { data } = await db().from("doubts").select("*").eq("asker_email", email).order("created_at", { ascending: false }).limit(50);
  return (data ?? []) as Doubt[];
}

export async function getDoubt(id: string): Promise<Doubt | null> {
  if (!isUuid(id)) return null;
  const { data } = await db().from("doubts").select("*").eq("id", id).maybeSingle();
  return (data as Doubt) ?? null;
}

export async function imageUrl(d: Doubt): Promise<string | null> {
  if (!d.image_path) return null;
  const { data } = await db().storage.from(BUCKET).createSignedUrl(d.image_path, 3600);
  return data?.signedUrl ?? null;
}

/** Save the question (and its photo), then let the AI answer it if we can. */
export async function ask(o: { email: string; subject: string; level: string; text: string; image?: File | null }): Promise<Doubt> {
  const s = db();
  const { data, error } = await s.from("doubts").insert({ asker_email: o.email, subject: o.subject, level: o.level, text: o.text || null }).select("*").single();
  if (error) throw new Error("db");
  let d = data as Doubt;
  let img: { type: ImageType; b64: string } | null = null;
  if (o.image && o.image.size > 0) {
    const type = IMAGE_TYPES.find((t) => t === o.image!.type);
    if (type && o.image.size <= MAX_IMAGE) {
      const buf = Buffer.from(await o.image.arrayBuffer());
      const path = `doubts/${d.id}.${type.split("/")[1]}`;
      const up = await s.storage.from(BUCKET).upload(path, buf, { contentType: type, upsert: true });
      if (!up.error) {
        await s.from("doubts").update({ image_path: path }).eq("id", d.id);
        d = { ...d, image_path: path };
      }
      img = { type, b64: buf.toString("base64") };
    }
  }
  if (AI_LIVE && (await usedToday(o.email)) < AI_DAILY) {
    const answer = await aiAnswer(o.subject, o.level, o.text, img).catch((e) => { console.error("[ask:ai]", e); return null; });
    if (answer) {
      await s.from("doubts").update({ ai_answer: answer }).eq("id", d.id);
      d = { ...d, ai_answer: answer };
    }
  }
  return d;
}

const client = () => new Anthropic();

const SYSTEM = `You are Mastermoshai (মাস্টারমশাই), a warm, patient tutor for Bangladeshi students following the NCTB curriculum (Class 6-10, SSC, HSC).
A student has sent a homework or study question, often as a phone photo of a textbook or notebook page.
- Reply in Bangla unless the student wrote in English. Use the terms NCTB textbooks use, with the English term in brackets the first time when it helps.
- Solve step by step: what is given, the formula or idea, the working, the final answer in bold. For theory, explain simply with one everyday Bangladeshi example.
- Keep it under about 300 words. Use plain Markdown (short headings, numbered steps); write formulas in plain text like v = u + at.
- If the photo is unclear or the question is incomplete, say exactly what you could not read and answer what you can.
- If it is not a study question, politely say you only help with studies.
- End with one short line suggesting the student can ask a tutor if anything is still unclear.`;

export async function aiAnswer(subject: string, level: string, text: string, img: { type: ImageType; b64: string } | null): Promise<string | null> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (img) content.push({ type: "image", source: { type: "base64", media_type: img.type, data: img.b64 } });
  content.push({ type: "text", text: `বিষয়: ${subject} · শ্রেণি: ${level}\n\n${text || "ছবির প্রশ্নটার সমাধান করে দাও।"}` });
  const res = await client().beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium" },
    system: SYSTEM,
    messages: [{ role: "user", content }],
  });
  if (res.stop_reason === "refusal") return null;
  const out = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
  return out || null;
}

/** The student wants a real tutor: take payment, then the question opens for tutors. */
export async function askTutor(d: Doubt, payer: string, coupon?: string) {
  await db().from("doubts").update({ status: "WAITING_PAYMENT", price: DOUBT_PRICE }).eq("id", d.id).in("status", ["AI", "WAITING_PAYMENT"]);
  return startPayment({ purpose: "DOUBT", refId: d.id, payer, listPrice: DOUBT_PRICE, coupon });
}

export async function openForTutor(subjects: string[]): Promise<Doubt[]> {
  let q = db().from("doubts").select("*").eq("status", "OPEN").order("created_at").limit(50);
  if (subjects.length) q = q.in("subject", subjects);
  const { data } = await q;
  return (data ?? []) as Doubt[];
}

export async function tutorDoubts(email: string): Promise<Doubt[]> {
  const { data } = await db().from("doubts").select("*").eq("tutor_email", email).order("claimed_at", { ascending: false }).limit(50);
  return (data ?? []) as Doubt[];
}

/** First tutor to claim gets it. A claim older than 2 hours without an answer goes back to the queue. */
export async function claim(id: string, tutor: string, name: string): Promise<boolean> {
  const s = db();
  await s.from("doubts").update({ status: "OPEN", tutor_email: null, tutor_name: null, claimed_at: null }).eq("status", "CLAIMED").lt("claimed_at", new Date(Date.now() - 2 * 3600_000).toISOString());
  const { data } = await s.from("doubts").update({ status: "CLAIMED", tutor_email: tutor, tutor_name: name, claimed_at: new Date().toISOString() }).eq("id", id).eq("status", "OPEN").select("id").maybeSingle();
  return Boolean(data);
}

export async function answer(id: string, tutor: string, text: string): Promise<boolean> {
  const body = text.trim().slice(0, 8000);
  if (!body) return false;
  const { data } = await db().from("doubts").update({ status: "ANSWERED", tutor_answer: body, answered_at: new Date().toISOString() }).eq("id", id).eq("tutor_email", tutor).eq("status", "CLAIMED").select("asker_email,tutor_name").maybeSingle();
  if (!data) return false;
  await notify({ email: data.asker_email, kind: "DOUBT_ANSWERED", title: `${data.tutor_name ?? "টিউটর"} উত্তর দিয়েছেন`, body: body.slice(0, 120), path: `/ask/${id}` });
  return true;
}
