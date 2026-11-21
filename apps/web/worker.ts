// Cloudflare Worker entry: the OpenNext Next.js handler plus the two cron jobs
// that Netlify scheduled functions used to run (apps/web/netlify/functions).
// @ts-ignore built by `opennextjs-cloudflare build`
import { default as handler } from "./.open-next/worker.js";

type Env = { CRON_SECRET?: string; NEXT_PUBLIC_SITE_URL?: string; [k: string]: unknown };

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext) {
    // Lecture sheet files are private; only the access-checked API route reads them.
    if (new URL(req.url).pathname.startsWith("/_sheets/")) return new Response("Not found", { status: 404 });
    return handler.fetch(req, env, ctx);
  },
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {
    const job = event.cron === "0 2 * * *" ? "daily" : "hourly";
    const base = env.NEXT_PUBLIC_SITE_URL || "https://mastermoshai.net";
    const req = new Request(`${base}/api/cron/${job}`, { headers: { authorization: `Bearer ${env.CRON_SECRET ?? ""}` } });
    const res: Response = await handler.fetch(req, env, ctx);
    console.log(`[${job}]`, res.status, await res.text());
  },
};
