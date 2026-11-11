# Porao (পড়াও)

1:1 and small-batch (up to 1:5) tutoring marketplace for Bangladesh: online live classes
and offline home tutors found on a map, free trial classes, a free lesson library,
advance payment held in escrow and released class by class, and flag-based refunds.

Plan and research: https://claude.ai/artifact/6c6x7LjVzeRXxoH7C9S9YY

## Layout

| Path | What |
| --- | --- |
| `packages/core` | Shared TypeScript rules: commission ladder, per-class shares, attendance outcomes, settlement/refunds, routine times (Dhaka), search ranking, demo data |
| `packages/db` | Prisma schema (PostgreSQL + PostGIS): users, teacher/student profiles, routine slots, enrollments, class sessions, presence log, escrow attendance rows, flags, double-entry ledger, payouts, videos, notifications |
| `apps/api` | Fastify API: search, trials, enrollment, payment callback, one-tap class start + LiveKit tokens, LiveKit webhooks, flags, admin rulings, earnings, payouts |
| `apps/web` | Next.js website: home, tutor search with map, tutor profile + routine, booking, live class waiting room, student and teacher dashboards |
| `apps/mobile` | Expo (React Native) app for Android and iOS: home, search, tutor, my classes, teacher earnings, class room, push notifications |

## Run it

```bash
pnpm install
pnpm test                         # core rules + API end-to-end flow
pnpm --filter @porao/web dev      # http://localhost:3000
pnpm --filter @porao/api dev      # http://localhost:4000
pnpm --filter @porao/mobile start # Expo Go on your phone
```

The web and mobile screens use demo data from `@porao/core` until they are wired to the API.
The API currently uses an in-memory store with the same methods the Prisma repository will implement.

## Money rules (packages/core)

- Student pays the month up front; it sits in `escrow`.
- Each class share is settled from the live-class join/leave log:
  completed → teacher 100%, teacher late >10 min or class <75% → 50%, teacher absent 15 min → 0% (+ strike),
  student absent → teacher 100%.
- 48-hour flag window, then release: teacher wallet gets share minus commission, platform keeps commission,
  student credit gets any refund. Subjective flags pause release until an admin rules 0 / 50 / 100%.
- Commission ladder 25% (first 50 paid classes) → 20% (to 200) → 15%. Students never see it.
- Stopping a plan refunds every class not yet held.

## Next steps

1. Prisma repository behind the `Marketplace` service + migrations (PostGIS search with `ST_DWithin`).
2. Phone OTP auth (JWT) replacing the `x-user-id` header.
3. LiveKit Cloud keys + `@livekit/components-react` / `@livekit/react-native` in the class rooms; verify webhook signatures.
4. SSLCommerz sandbox checkout + IPN verification; bKash disbursement for payouts.
5. BullMQ jobs: reminders (24 h / 1 h / 10 min), room auto-end, escrow release, strike checks.
6. Bunny Stream uploads for the free lesson library; admin panel for verification and disputes.
