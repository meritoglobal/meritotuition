"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/batches";
import { DATA_LIVE } from "@/lib/data";
import { openThread } from "@/lib/growth/chat";
import { me } from "@/lib/growth/people";
import { AREAS, getPrefs, getRequest, isLive, placeBid, savePrefs, toNumber, tutorMaySee, withdrawBid } from "@/lib/growth/requests";

export type TState = { ok?: boolean; error?: string } | null;

async function tutor() {
  const m = await me();
  if (!m || !DATA_LIVE) redirect("/teach");
  const t = await getProfile(m.user.id);
  if (!t) redirect("/teach/profile");
  return { m, t };
}

export async function savePrefsAction(_: TState, f: FormData): Promise<TState> {
  const { t } = await tutor();
  const p = await getPrefs(t.user_id);
  await savePrefs({
    ...p, open: f.get("open") === "on", notify: f.get("notify") === "on",
    min_budget: toNumber(f.get("min_budget")) || null,
    extra_areas: f.getAll("extra").map(String).filter((a) => AREAS.includes(a)),
  });
  revalidatePath("/teach/requests");
  return { ok: true };
}

export async function bid(id: string, _: TState, f: FormData): Promise<TState> {
  const { t } = await tutor();
  const r = await getRequest(id);
  if (!r || !isLive(r)) return { error: "closed" };
  if (!(await tutorMaySee(r, t))) return { error: "cant" };
  const price = toNumber(f.get("price"));
  if (!(price >= 500 && price <= 100000)) return { error: "bad" };
  const b = await placeBid(r, t, price, String(f.get("message") ?? ""));
  if (!b) return { error: "bad" };
  revalidatePath(`/teach/requests/${id}`);
  return { ok: true };
}

export async function withdraw(id: string) {
  const { t } = await tutor();
  const r = await getRequest(id);
  if (r) await withdrawBid(r, t.user_id);
  revalidatePath(`/teach/requests/${id}`);
}

/** Open (or create) the chat with the student who posted this request. */
export async function messageStudent(id: string) {
  const { m, t } = await tutor();
  const r = await getRequest(id);
  if (!r || r.status === "CLOSED" || !(await tutorMaySee(r, t))) redirect(`/teach/requests/${id}`);
  redirect(`/chat/${await openThread(m.email, r.student_email)}`);
}
