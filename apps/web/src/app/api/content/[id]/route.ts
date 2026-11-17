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
  for (const base of [path.join(process.cwd(), "content/sheets"), path.join(process.cwd(), "apps/web/content/sheets")]) {
    const html = await readFile(path.join(base, path.basename(file)), "utf8").catch(() => null);
    if (html) return html;
  }
  return null;
}

/** GET → the lecture sheet's HTML, only for tutors, students of a tutor in that subject+class, and segment subscribers. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const item = CONTENT.find((c) => c.id === id);
  if (!item) return page(404, "পাওয়া গেল না", "এই শিটটা আর নেই।", "/learn", "সব লেকচার শিট");
  const m = await me();
  if (!m) return page(401, "আগে ঢুকে নাও", "লেকচার শিট পড়তে লগইন লাগবে।", `/login?next=${encodeURIComponent(`/learn/${id}`)}`, "লগইন করি →");
  const a = contentAccess(item, await accessContext(m));
  if (!a.open) return page(403, "এই শিটে তালা দেওয়া", "এই বিষয়টা মাস্টারমশাইয়ের যেকোনো টিউটরের কাছে পড়লে একদম ফ্রি। নয়তো পুরো ক্লাসের সব শিট আর পরীক্ষা মাসে ৯৯৯ টাকায়।", "/learn", "কীভাবে খুলব দেখি →");
  const html = await load(item.file);
  if (!html) return page(500, "শিটটা খোলা গেল না", "একটু পরে আবার চেষ্টা করো।", "/learn", "ফিরে যাই");
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store", "x-robots-tag": "noindex" } });
}
