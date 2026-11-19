import { fail, json } from "@/lib/api";
import { DATA_LIVE, db } from "@/lib/data";
import { contentRenewalSweep } from "@/lib/biz/content-subs";
import { expireLots } from "@/lib/biz/earnings";
import { renewalSweep } from "@/lib/growth/packages";
import { notify, sendMail, SITE } from "@/lib/growth/notify";
import { reportText, weeklyReport } from "@/lib/growth/parent";
import { weekStart } from "@/lib/growth/people";
import { proReminders, settlePro } from "@/lib/growth/pro";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Once a day (Netlify scheduled function, 8 AM Dhaka). Per-class pay and payouts run hourly (/api/cron/hourly). Needs CRON_SECRET as
 * `authorization: Bearer …`. Every day: renewal reminders, lapsed months, Pro reminders, Pro money-back.
 * Saturdays (or ?weekly=1): last week's report to every linked parent.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return fail("forbidden", 403);
  if (!DATA_LIVE) return fail("data-off", 503);
  const out: Record<string, unknown> = { renewals: await renewalSweep(), proReminders: await proReminders(), proGuarantee: await settlePro() };
  // Money and routine jobs; each is safe to run again.
  out.content = await contentRenewalSweep().catch((e) => String(e));
  out.expiredLots = await expireLots().catch((e) => String(e));

  const now = new Date();
  const saturday = new Date(now.getTime() + 6 * 3600_000).getUTCDay() === 6;
  if (saturday || new URL(req.url).searchParams.get("weekly") === "1") {
    const week = weekStart(new Date(now.getTime() - 86_400_000)); // the week that just ended
    const { data: links } = await db().from("guardian_links").select("guardian_email,student_email,student_id,student_name,weekly_email");
    let sent = 0;
    for (const l of links ?? []) {
      const r = await weeklyReport(l.student_email, l.student_id, week).catch(() => null);
      if (!r) continue;
      const name = l.student_name || l.student_email.split("@")[0]!;
      const path = `/parent?child=${encodeURIComponent(l.student_email)}&week=${week}`;
      await notify({ email: l.guardian_email, kind: "WEEKLY_REPORT", title: `${name}-এর সাপ্তাহিক রিপোর্ট`, body: `ক্লাস ${r.attendedTotal}/${r.plannedTotal}`, path });
      if (l.weekly_email && (await sendMail(l.guardian_email, `মাস্টারমশাই · ${name}-এর সাপ্তাহিক রিপোর্ট`, `${reportText(r, name)}\n\nপুরো রিপোর্ট: ${SITE}${path}`))) sent++;
    }
    out.weekly = { week, parents: links?.length ?? 0, emailed: sent };
  }
  return json(out);
}
