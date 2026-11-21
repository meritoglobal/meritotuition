import { readFile } from "node:fs/promises";
import path from "node:path";
import { contentAccess } from "@mastermoshai/core";
import { accessContext } from "@/lib/biz/access";
import { CONTENT } from "@/lib/content-catalog";
import { me } from "@/lib/growth/people";

export const dynamic = "force-dynamic";

const page = (status: number, title: string, body: string, link: string, linkText: string) =>
  new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<body style="font-family:'Noto Sans Bengali',Inter,system-ui,sans-serif;max-width:520px;margin:12vh auto;padding:0 16px;color:#1d2a24;background:#fff">
<h1 style="font-size:22px">${title}</h1><p style="line-height:1.6">${body}</p><p><a href="${link}" target="_top" style="color:#1f5c45;font-weight:700">${linkText}</a></p></body>`,
  { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

async function load(file: string): Promise<string | null> {
  // Cloudflare: sheets live in the worker's private static files (/_sheets, see wrangler.jsonc).
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const assets = (getCloudflareContext().env as { ASSETS?: { fetch: (u: string) => Promise<Response> } }).ASSETS;
    if (assets) {
      const r = await assets.fetch(`https://assets.local/_sheets/${encodeURIComponent(path.basename(file))}`);
      if (r.ok) return await r.text();
    }
  } catch { /* not on Cloudflare: read from disk below */ }
  for (const base of [path.join(process.cwd(), "content/sheets"), path.join(process.cwd(), "apps/web/content/sheets")]) {
    const html = await readFile(path.join(base, path.basename(file)), "utf8").catch(() => null);
    if (html) return html;
  }
  return null;
}

/**
 * Make saving/copying/printing hard: no select/copy/right-click/print/save keys, print shows nothing,
 * and a faint repeating watermark with the viewer's email and the time, so a leaked photo points back to them.
 * (Nothing in a browser can stop a camera; the app adds FLAG_SECURE on top.)
 */
function protect(html: string, who: string): string {
  const mark = `${who} · mastermoshai.net · ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}`.replace(/[<>&"']/g, "");
  const svg = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="220"><text x="10" y="120" transform="rotate(-24 210 110)" fill="rgba(30,60,50,0.09)" font-size="15" font-family="sans-serif">${mark}</text></svg>`);
  const guard = `<style id="mm-guard">
html,body{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}
body::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:2147483647;background-image:url("data:image/svg+xml,${svg}")}
img,svg{-webkit-user-drag:none;user-drag:none;pointer-events:none}
@media print{html,body{display:none!important}}
</style><script>(function(){var s=function(e){e.preventDefault();return false};
["contextmenu","copy","cut","dragstart","selectstart","beforeprint"].forEach(function(t){document.addEventListener(t,s,true)});
document.addEventListener("keydown",function(e){var k=(e.key||"").toLowerCase();if((e.ctrlKey||e.metaKey)&&["s","p","c","u","a"].indexOf(k)>-1||k==="printscreen"||(e.ctrlKey&&e.shiftKey&&k==="i")){e.preventDefault();e.stopPropagation()}},true);
window.print=function(){};})();</script>`;
  return html.includes("</head>") ? html.replace("</head>", `${guard}</head>`) : guard + html;
}

/** GET → the lecture sheet's HTML, only for verified tutors, students of a verified tutor in that subject+class, and segment subscribers. Only inside our pages (or the app with ?embed=app). */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  // Opened directly in a tab (to save it)? Send them to the viewer page instead.
  const dest = req.headers.get("sec-fetch-dest");
  if (dest === "document" && new URL(req.url).searchParams.get("embed") !== "app") return Response.redirect(new URL(`/learn/${encodeURIComponent(id)}`, req.url), 302);
  const item = CONTENT.find((c) => c.id === id);
  if (!item) return page(404, "পাওয়া গেল না", "এই শিটটা আর নেই।", "/learn", "সব লেকচার শিট");
  const m = await me();
  if (!m) return page(401, "আগে ঢুকে নাও", "লেকচার শিট পড়তে লগইন লাগবে।", `/login?next=${encodeURIComponent(`/learn/${id}`)}`, "লগইন করি →");
  const a = contentAccess(item, await accessContext(m));
  if (!a.open) return page(403, "এই শিটে তালা দেওয়া", "এই বিষয়টা মাস্টারমশাইয়ের যেকোনো টিউটরের কাছে পড়লে একদম ফ্রি। নয়তো পুরো ক্লাসের সব শিট আর পরীক্ষা মাসে ৯৯৯ টাকায়। টিউটর হলে আগে আইডি যাচাই করুন।", "/learn", "কীভাবে খুলব দেখি →");
  const html = await load(item.file);
  if (!html) return page(500, "শিটটা খোলা গেল না", "একটু পরে আবার চেষ্টা করো।", "/learn", "ফিরে যাই");
  return new Response(protect(html, m.email), {
    headers: {
      "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store, max-age=0", "x-robots-tag": "noindex, nofollow, noarchive",
      "x-frame-options": "SAMEORIGIN", "content-security-policy": "frame-ancestors 'self'", "content-disposition": "inline",
    },
  });
}
