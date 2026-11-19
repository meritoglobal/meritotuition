import "server-only";
import { BUCKET, DATA_LIVE, db } from "@/lib/data";

/**
 * Account deletion (App Store / Play Store requirement). Removes the login and personal
 * data. Payment records (payments, subscriptions, credits, tutor earnings and payouts) are
 * kept, because the law requires keeping financial records; they hold only an email.
 */

export interface DeleteCheck { ok: boolean; balance: number; pending: number }

/** A tutor with money still in the wallet (or a payout on its way) must withdraw first. */
export async function canDelete(userId: string): Promise<DeleteCheck> {
  if (!DATA_LIVE) return { ok: true, balance: 0, pending: 0 };
  const s = db();
  const [{ data: bal }, { count }] = await Promise.all([
    s.rpc("wallet_balance", { t: userId }),
    s.from("withdrawals").select("id", { count: "exact", head: true }).eq("teacher_id", userId).in("status", ["QUEUED", "SENDING"]),
  ]);
  const balance = Number(bal ?? 0);
  return { ok: balance <= 0 && !count, balance, pending: count ?? 0 };
}

type Step = [table: string, column: string, by: "email" | "id"];

const DELETE: Step[] = [
  ["app_notifications", "email", "email"],
  ["batch_students", "email", "email"],
  ["class_attendance", "email", "email"],
  ["schedule_votes", "email", "email"],
  ["student_segments", "email", "email"],
  ["guardian_codes", "student_email", "email"],
  ["guardian_links", "student_email", "email"],
  ["guardian_links", "guardian_email", "email"],
  ["progress_notes", "student_email", "email"],
  ["model_test_attempts", "email", "email"],
  ["tuition_requests", "student_email", "email"],
  ["doubts", "asker_email", "email"],
  ["referral_codes", "email", "email"],
  ["chat_threads", "a_email", "email"],
  ["chat_threads", "b_email", "email"],
  ["exam_submissions", "student_id", "id"],
  ["request_bids", "teacher_id", "id"],
  ["request_invites", "teacher_id", "id"],
  ["teacher_request_prefs", "user_id", "id"],
  ["teacher_wallets", "teacher_id", "id"],
  ["tutor_verifications", "user_id", "id"],
  ["teacher_profiles", "user_id", "id"],
];

export async function deleteAccount(u: { id: string; email: string }): Promise<{ error?: "balance" | "auth" }> {
  if (!DATA_LIVE) return {};
  if (!(await canDelete(u.id)).ok) return { error: "balance" };
  const s = db();
  // Stop anything that would charge them again.
  await s.from("subscriptions").update({ auto_renew: false }).eq("payer_email", u.email);
  await s.from("content_subscriptions").update({ auto_renew: false }).eq("payer_email", u.email);
  await s.from("batches").update({ active: false }).eq("teacher_id", u.id);
  // ID card photos.
  const dir = `tutor-ids/${u.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const { data: files } = await s.storage.from(BUCKET).list(dir);
  if (files?.length) await s.storage.from(BUCKET).remove(files.map((f) => `${dir}/${f.name}`));
  for (const [table, col, by] of DELETE) {
    const { error } = await s.from(table).delete().eq(col, by === "email" ? u.email : u.id);
    if (error && error.code !== "42P01") console.error("[account:delete]", table, error.message); // 42P01: table not set up yet
  }
  await s.from("account_deletions").insert({ user_id: u.id, email: u.email }).then(() => null, () => null);
  const { error } = await s.auth.admin.deleteUser(u.id);
  if (error) {
    console.error("[account:delete] auth", error.message);
    return { error: "auth" };
  }
  return {};
}
