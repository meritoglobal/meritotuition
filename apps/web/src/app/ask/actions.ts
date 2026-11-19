"use server";
import { redirect } from "next/navigation";
import { DATA_LIVE } from "@/lib/data";
import { askTutor, getDoubt } from "@/lib/growth/ask";
import { me } from "@/lib/growth/people";

export async function toTutor(id: string) {
  const m = await me();
  if (!m || !DATA_LIVE) redirect("/ask");
  const d = await getDoubt(id);
  if (!d || d.asker_email !== m.email || !["AI", "WAITING_PAYMENT"].includes(d.status)) redirect(`/ask/${id}`);
  const { url } = await askTutor(d, m.email);
  redirect(url);
}
