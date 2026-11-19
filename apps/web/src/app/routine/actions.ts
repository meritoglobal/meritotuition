"use server";
import { revalidatePath } from "next/cache";
import { DATA_LIVE } from "@/lib/data";
import { getChange, vote } from "@/lib/biz/schedule";
import { me } from "@/lib/growth/people";

export async function answer(id: string, v: "APPROVE" | "REJECT") {
  const m = await me();
  if (!m || !DATA_LIVE) return;
  const ch = await getChange(id);
  if (ch) await vote(ch, m.email, v);
  revalidatePath("/routine");
}
