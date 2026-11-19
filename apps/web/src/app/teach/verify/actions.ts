"use server";
import { revalidatePath } from "next/cache";
import { DATA_LIVE } from "@/lib/data";
import { submitId } from "@/lib/biz/verify";
import { me } from "@/lib/growth/people";

export type VerifyState = { status?: string; error?: "image" | "profile" | "db" } | null;

export async function sendId(_: VerifyState, f: FormData): Promise<VerifyState> {
  const m = await me();
  if (!m || !DATA_LIVE) return { error: "db" };
  const front = f.get("front"), back = f.get("back");
  if (!(front instanceof File) || front.size === 0) return { error: "image" };
  const r = await submitId({ userId: m.user.id, email: m.email, front, back: back instanceof File ? back : null });
  revalidatePath("/teach/verify");
  revalidatePath("/teach");
  return "error" in r ? { error: r.error } : { status: r.status };
}
