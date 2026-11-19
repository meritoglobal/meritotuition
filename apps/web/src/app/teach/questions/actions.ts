"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/batches";
import { DATA_LIVE } from "@/lib/data";
import { answer, claim } from "@/lib/growth/ask";
import { me } from "@/lib/growth/people";

export type AnsState = { ok?: boolean; error?: string } | null;

export async function claimQ(id: string) {
  const m = await me();
  if (!m || !DATA_LIVE) return;
  const p = await getProfile(m.user.id);
  if (!p) redirect("/teach/profile");
  const ok = await claim(id, m.email, p.name);
  if (ok) redirect(`/ask/${id}`);
  revalidatePath("/teach/questions");
}

export async function answerQ(id: string, _: AnsState, f: FormData): Promise<AnsState> {
  const m = await me();
  if (!m || !DATA_LIVE) return { error: "login" };
  const ok = await answer(id, m.email, String(f.get("answer") ?? ""));
  if (!ok) return { error: "bad" };
  revalidatePath(`/ask/${id}`);
  return { ok: true };
}
