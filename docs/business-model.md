# Content access, ৳999 packs, commission tiers, tutor wallet, routine changes

## Rules
- **Free content with a tutor:** a student on any active batch gets every lecture sheet and exam of that batch's subject for that class (`contentAccess` in `packages/core/src/business.ts`). A Class 6-8 batch opens classes 6, 7 and 8.
- **Segment pack:** one student × one segment (Class 6, 7, 8, SSC = 9-10, HSC = 11-12), ৳999/month (`CONTENT_PRICE` env to change). Opens every subject of the segment. Paid with bKash like packages (purpose `CONTENT`).
- **Tutors** (anyone with a tutor profile) and admins see all content. Lecture sheets live in `apps/web/content/sheets/` and are served only through `/api/content/{id}`.
- **Commission tiers** by lifetime paying students: 20% new → 15% (10+) → 12% (25+) → 10% (50+) → 5% (100+ and expert badge from admin). `COMMISSION_TIERS` in core.
- **Money flow:** student/parent pays a package upfront (monthly, or once per batch) → escrow lot → each class the tutor holds (tutor opened the room and at least one student joined, 40 min after start) releases one class share of every paying student's lot, commission kept, rest to the tutor's wallet → tutor withdraws up to 100% to bKash. Lots not used by period end + 7 days (batch: + 30) go back to the payer as bonus credit. Classes with no student join stay on hold for admin (`/admin/payouts`).
- **Routine change / reschedule:** tutor proposes on the batch page; every student on the batch must approve; one "no" rejects. Routine proposals expire in 7 days, moves when the class time arrives.

## Setup
1. Supabase SQL Editor: run `supabase/business.sql` after `class-tools.sql` and `growth.sql`.
2. Netlify: the new scheduled function `apps/web/netlify/functions/hourly.mts` needs `CRON_SECRET` (already used by the daily one).
3. Optional env: `CONTENT_PRICE` (999), `MIN_WITHDRAW` (50), `SETTLE_AFTER_MIN` (40).
4. **bKash payouts.** Withdrawals are queued and paid by hand from `/admin/payouts` until bKash enables **B2C Payout (Disbursement)** on the merchant account. Ask bKash for: B2C payout permission, a disbursement wallet, intra-account transfer (Collection → Disbursement), and the payout API credentials. Then set `BKASH_PAYOUT_BASE_URL` (live `https://checkout.pay.bka.sh/v1.2.0-beta`) and `BKASH_PAYOUT_APP_KEY/APP_SECRET/USERNAME/PASSWORD` (falls back to the checkout keys), and `BKASH_PAYOUT_TOPUP=on` to move money to the disbursement wallet automatically before each payout. Check endpoint paths in `lib/biz/bkash-payout.ts` against the document bKash sends.

## API (for the app; cookie session like the rest of `/api`)
- `GET /api/content?segment=&subject=` → price, segments, items with `access {open, via: teacher|subscription|staff, teacherName}`, my packs
- `GET /api/content/{id}` → sheet HTML (403 page when locked)
- `POST /api/content/subscribe {segment, childEmail?, autoRenew?, coupon?, preview?}` → `{url}` for bKash
- `POST /api/content/subscriptions/{id} {action: renew|auto|cancel, on?}`
- `GET /api/wallet` · `POST /api/wallet {action: withdraw, amount}` / `{action: number, number, autoPayout?}` / `{action: auto, on}`
- `GET /api/tiers`
- `GET /api/schedule-changes` (student) · `POST /api/schedule-changes/{id} {vote: APPROVE|REJECT}` or `{action: cancel}` (tutor)
- `GET|POST /api/batches/{id}/schedule-changes {kind: ROUTINE, schedule:[{day,time,minutes}]} | {kind: RESCHEDULE, fromAt, toAt, minutes?}`
