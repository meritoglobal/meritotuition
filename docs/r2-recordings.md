# ক্লাস রেকর্ডিং: Cloudflare R2 সেটআপ (একবারই করতে হবে)

টিচারের ফোন/ল্যাপটপ ক্লাস রেকর্ড করে R2-তে তুলে দেয়। স্টুডেন্টরা ক্লাসের "রেকর্ডিং" ট্যাব থেকে ৭২ ঘণ্টা দেখতে ও নামাতে পারে, তারপর নিজে থেকে মুছে যায়।

1. **Cloudflare account**: https://dash.cloudflare.com → Sign up (ফ্রি)। বাঁ দিকে **R2 Object Storage** → চালু করুন (কার্ড চাইবে, ১০ GB পর্যন্ত ফ্রি)।
2. **Bucket বানান**: Create bucket → নাম `mastermoshai-recordings` → Location: **Asia-Pacific (APAC)** → Create।
3. **৭২ ঘণ্টা পর অটো-ডিলিট**: bucket → **Settings** → **Object lifecycle rules** → Add rule
   - Name: `delete-after-3-days`, Prefix: `rec/`
   - "Delete objects" → **3 days** পর
   - "Abort incomplete multipart uploads" → **1 day** পর
4. **CORS** (ব্রাউজার থেকে সরাসরি আপলোড/দেখার জন্য): bucket → Settings → **CORS Policy** → Edit → নিচেরটা পেস্ট করে Save:
   ```json
   [
     {
       "AllowedOrigins": ["https://mastermoshai.net", "https://www.mastermoshai.net", "https://mastermoshai.netlify.app"],
       "AllowedMethods": ["GET", "PUT"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
5. **চাবি (API token)**: R2 পেজে **Manage API tokens** → Create API token → Permission: **Object Read & Write** → শুধু `mastermoshai-recordings` bucket → Create।
   দেখাবে: **Access Key ID**, **Secret Access Key**, আর আপনার **Account ID** (R2 পেজের ডান দিকে)। এগুলো কাউকে চ্যাটে দেবেন না।
6. **Netlify**: Site configuration → Environment variables → এই ৪টা যোগ করুন:
   - `R2_ACCOUNT_ID` = Account ID
   - `R2_ACCESS_KEY_ID` = Access Key ID
   - `R2_SECRET_ACCESS_KEY` = Secret Access Key
   - `R2_BUCKET` = `mastermoshai-recordings`

   তারপর Deploys → Trigger deploy।

খরচের আন্দাজ: ১ ঘণ্টার ক্লাস ≈ ৩০০ MB। ৩ দিনে যত ক্লাস জমে, শুধু তার জায়গার দাম ($0.015/GB/মাস)। স্টুডেন্টরা যত খুশি দেখুক/নামাক, R2-তে ডাউনলোডের টাকা নেই।
