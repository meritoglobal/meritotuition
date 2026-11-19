// Netlify scheduled function: once a day at 08:00 Dhaka (02:00 UTC) it calls
// /api/cron/daily for bKash renewal reminders and, on Saturdays, parents' weekly reports.
// Needs CRON_SECRET set in Netlify environment variables.
export default async () => {
  const base = process.env.URL ?? "https://mastermoshai.net";
  const r = await fetch(`${base}/api/cron/daily`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` } });
  console.log("[daily]", r.status, await r.text());
};

export const config = { schedule: "0 2 * * *" };
