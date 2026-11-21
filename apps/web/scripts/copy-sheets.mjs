// After `opennextjs-cloudflare build`: copy lecture sheets into the worker's static files
// under /_sheets (blocked for visitors in worker.ts; read by /api/content/[id] via the ASSETS binding).
import { cpSync, existsSync } from "node:fs";
if (existsSync("content/sheets")) cpSync("content/sheets", ".open-next/assets/_sheets", { recursive: true });
console.log("lecture sheets copied to .open-next/assets/_sheets");
