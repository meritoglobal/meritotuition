"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { deleteAccount } from "@/lib/account";
import { AUTH_LIVE, DEMO_COOKIE } from "@/lib/auth/config";
import { supabaseServer } from "@/lib/auth/supabase";
import { getUser } from "@/lib/auth/session";
import { keyOf } from "@/lib/growth/people";

export type DeleteState = { error?: "confirm" | "balance" | "auth" | "login" } | null;

export async function deleteMe(_: DeleteState, f: FormData): Promise<DeleteState> {
  const u = await getUser();
  if (!u) return { error: "login" };
  if (f.get("confirm") !== "on") return { error: "confirm" };
  const r = await deleteAccount({ id: u.id, email: keyOf(u) });
  if (r.error) return { error: r.error };
  if (AUTH_LIVE) await (await supabaseServer()).auth.signOut().catch(() => null);
  (await cookies()).delete(DEMO_COOKIE);
  redirect("/account/delete?done=1");
}
