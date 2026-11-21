import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Cloudflare Workers build of the website (OpenNext). Every page here is dynamic
// (login, Supabase), so no extra cache storage (R2/KV) is needed: free plan is enough.
export default defineCloudflareConfig({});
