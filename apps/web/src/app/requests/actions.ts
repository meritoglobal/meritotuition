"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DATA_LIVE, db } from "@/lib/data";
import { openThread } from "@/lib/growth/chat";
import { displayName, me } from "@/lib/growth/people";
import { MAX_OPEN, acceptBid, clean, getRequest, invite, openCount, postRequest, setStatus } from "@/lib/growth/requests";

export type ReqState = { error?: string; id?: string; notified?: number } | null;

export async function post(_: ReqState, f: FormData): Promise<ReqState> {
  const m = await me();
  if (!m || !DATA_LIVE) return { error: "db" };
  const r = clean(Object.fromEntries(f));
  if ("error" in r) return r;
  if ((await openCount(m.email)) >= MAX_OPEN) return { error: "limit" };
  const made = await postRequest(m.email, await displayName(m.email), r).catch((e) => { console.error("[request]", e); return null; });
  if (!made) return { error: "db" };
  revalidatePath("/requests");
  return { id: made.id, notified: made.notified };
}

async function mine(id: string) {
  const m = await me();
  if (!m || !DATA_LIVE) redirect("/requests");
  const r = await getRequest(id);
  if (!r || r.student_email !== m.email) redirect("/requests");
  return { m, r };
}

export async function choose(id: string, bidId: string) {
  const { m, r } = await mine(id);
  const b = await acceptBid(r, bidId);
  if (b) redirect(`/chat/${await openThread(m.email, b.teacher_email)}`);
  revalidatePath(`/requests/${id}`);
}

export async function inviteTutor(id: string, teacherId: string) {
  const { r } = await mine(id);
  await invite(r, teacherId);
  revalidatePath(`/requests/${id}`);
}

export async function closeReq(id: string) {
  const { r } = await mine(id);
  await setStatus(r, "CLOSED");
  revalidatePath(`/requests/${id}`);
}

export async function reopenReq(id: string) {
  const { m, r } = await mine(id);
  if (r.status !== "OPEN" && (await openCount(m.email)) < MAX_OPEN) await setStatus(r, "OPEN");
  revalidatePath(`/requests/${id}`);
}

/** Bound with the bid id, never the tutor's email, so contact details stay out of the page. */
export async function messageTutor(id: string, bidId: string) {
  const { m } = await mine(id);
  const { data } = await db().from("request_bids").select("teacher_email").eq("id", bidId).eq("request_id", id).maybeSingle();
  if (!data) redirect(`/requests/${id}`);
  redirect(`/chat/${await openThread(m.email, data.teacher_email)}`);
}
