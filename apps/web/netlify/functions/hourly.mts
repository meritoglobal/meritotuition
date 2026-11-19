// Netlify scheduled function: every hour it calls /api/cron/hourly to pay tutors
// for classes held, send bKash payouts, and close routine-change proposals that expired.
// Needs CRON_SECRET set in Netlify environment variables.
export default async () => {
  const base = process.env.URL ?? "https://mastermoshai.net";
  const r = await fetch(`${base}/api/cron/hourly`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` } });
  console.log("[hourly]", r.status, await r.text());
};

export const config = { schedule: "7 * * * *" };
