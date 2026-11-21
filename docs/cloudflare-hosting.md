# ওয়েবসাইট Netlify থেকে Cloudflare-এ সরানো (ধাপে ধাপে)

কোডের কাজ করা আছে (এই PR)। নিচের ধাপগুলো শুধু আপনিই ড্যাশবোর্ডে করতে পারবেন।
পুরো সময়টা সাইট বন্ধ হবে না: Cloudflare-এ সব ঠিকমতো চলছে দেখার পরই ডোমেইন সরানো হবে।

## খরচ

- Cloudflare Workers **Free** প্ল্যানে শুরু করা যায়: দিনে ১ লাখ রিকোয়েস্ট, ছবি/CSS/JS ফাইল ফ্রি ও সীমাহীন।
- সতর্কতা: Free প্ল্যানে প্রতিটা রিকোয়েস্টে CPU সময় ১০ মিলিসেকেন্ড। ভারী পেজে কখনো "Error 1102" আসতে পারে।
  এমন হলে বা আসল লঞ্চের সময় **Workers Paid ($5/মাস)** নিতে হবে (Netlify Pro $19/মাসের চেয়ে অনেক কম)।
- "Powered by Netlify" ব্যাজ আর থাকবে না।

## ধাপ ১: Cloudflare-এ GitHub থেকে সাইট বানানো

1. https://dash.cloudflare.com এ ফ্রি অ্যাকাউন্ট খুলুন (থাকলে লগইন)।
2. বাঁ দিকে **Workers & Pages** → **Create** → **Import a repository** (Workers ট্যাব)।
3. GitHub কানেক্ট করে `meritoglobal/meritotuition` বেছে নিন।
4. এই ঘরগুলো এভাবে দিন:
   - Project name: `mastermoshai` (ঠিক এটাই, বানান বদলাবেন না)
   - Production branch: `main`
   - **Advanced settings → Root directory / Path:** `apps/web`
   - Build command: `pnpm build:cf`
   - Deploy command: `pnpm deploy:cf`
5. **Build variables** অংশে (একই পেজে, বা পরে Settings → Build → Variables and secrets) যোগ করুন:
   - `NODE_VERSION` = `22`
   - Netlify-তে যত ভ্যারিয়েবলের নাম `NEXT_PUBLIC_` দিয়ে শুরু, সবগুলো একই নাম আর মান দিয়ে
     (যেমন `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`)।
6. **Deploy** চাপুন। ৩-৫ মিনিট লাগবে। প্রথমবার ফেল করলে লগের স্ক্রিনশট পাঠান।

## ধাপ ২: বাকি সব ভ্যারিয়েবল (চাবি) বসানো

Netlify খুলুন: **Site configuration → Environment variables**। ওখানে যা যা আছে, প্রতিটা Cloudflare-এ বসান:
**Workers & Pages → mastermoshai → Settings → Variables and Secrets → Add**।

- `NEXT_PUBLIC_...` গুলো এখানেও আবার দিন (Type: Text)।
- গোপন চাবিগুলো **Type: Secret** দিয়ে দিন: `SUPABASE_SECRET_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_API_KEY`,
  `ANTHROPIC_API_KEY`, `BKASH_APP_SECRET`, `BKASH_PASSWORD`, `CRON_SECRET`, `RESEND_API_KEY`, `R2_SECRET_ACCESS_KEY` (যেগুলো আছে)।
- বাকিগুলো Text: `SUPABASE_URL`, `LIVEKIT_URL`, `ADMIN_EMAILS`, `BKASH_*`, `MAIL_FROM`, `R2_*` ইত্যাদি।
- `CRON_SECRET` না থাকলে একটা বানিয়ে দিন (যেকোনো লম্বা এলোমেলো লেখা)। এটা ছাড়া ঘণ্টায় টিউটর পেমেন্ট আর দৈনিক রিমাইন্ডার চলবে না।

সব বসানোর পর **Deployments → সবচেয়ে উপরেরটা → Retry/Redeploy** দিন (NEXT_PUBLIC_ বদলালে নতুন build লাগে)।

## ধাপ ৩: টেস্ট

Cloudflare একটা ঠিকানা দেবে, যেমন `https://mastermoshai.<আপনার-নাম>.workers.dev`। ওটায় দেখুন:
হোম পেজ, ইমেইল কোডে লগইন, টিউটর প্যানেল, লাইভ ক্লাস, লেকচার শিট। ঠিক থাকলে ঠিকানাটা আমাকে দিন।

## ধাপ ৪: ডোমেইন mastermoshai.net Cloudflare-এ আনা

1. Cloudflare হোমে **Add a domain** (Onboard a domain) → `mastermoshai.net` → **Free** প্ল্যান।
2. Cloudflare আগের DNS রেকর্ডগুলো (A `75.2.60.5`, CNAME `www`, ইমেইলের MX থাকলে সেটাও) নিজে তুলে আনবে। সব আছে কিনা দেখে **Continue**।
   এখনো সাইট Netlify থেকেই চলবে, তাই কিছু বন্ধ হবে না।
3. Cloudflare দুটো **nameserver** দেবে (যেমন `xxx.ns.cloudflare.com`)।
4. Namecheap → **Domain List → mastermoshai.net → Manage → Nameservers → Custom DNS** → ওই দুটো বসিয়ে ✔ চাপুন।
5. কয়েক মিনিট থেকে কয়েক ঘণ্টা পর Cloudflare ইমেইল দেবে "domain is active"।

## ধাপ ৫: ডোমেইন Worker-এ জোড়া (আসল সুইচ)

1. Cloudflare → **mastermoshai.net → DNS → Records**: পুরনো A `@` (75.2.60.5) আর CNAME `www` রেকর্ড দুটো **Delete** করুন। (MX/TXT থাকলে রেখে দিন।)
2. সঙ্গে সঙ্গে **Workers & Pages → mastermoshai → Settings → Domains & Routes → Add → Custom domain**:
   `mastermoshai.net` যোগ করুন, তারপর আবার `www.mastermoshai.net`।
3. ১-২ মিনিটে HTTPS সহ সাইট Cloudflare থেকে চলবে। https://mastermoshai.net খুলে লগইন করে দেখুন।

## ধাপ ৬: Netlify বন্ধ করা (১-২ দিন সব ঠিক থাকলে)

- Netlify → mastermoshai → **Site configuration → Build & deploy → Stop builds** (বা পুরো সাইট Delete)।
- আমাকে বললে রিপো থেকে `netlify.toml` আর Netlify প্লাগিন সরিয়ে দেব।

## যা বদলাতে হবে না

Supabase, LiveKit webhook, bKash callback সব `mastermoshai.net` ঠিকানায়, তাই ডোমেইন একই থাকায় কিছু বদলাতে হবে না।
পরে ক্লাস রেকর্ডিংয়ের R2 এই একই Cloudflare অ্যাকাউন্টে খুলবেন (`docs/r2-recordings.md`)।
