-- Mastermoshai: content access and the ৳999 class/segment subscription, per-class
-- teacher earnings (wallet), bKash withdrawals, and routine changes that students approve.
-- Paste into Supabase → SQL Editor → Run, AFTER class-tools.sql and growth.sql. Safe to run more than once.
-- Server-only tables (secret key): row level security on, no public policies.

-- ---------------------------------------------------------------------------
-- Payments now also cover content subscriptions; packages can be paid per batch.
-- ---------------------------------------------------------------------------
alter table payments drop constraint if exists payments_purpose_check;
alter table payments add constraint payments_purpose_check check (purpose in ('PACKAGE', 'TEST', 'DOUBT', 'CONTENT', 'PRO'));

alter table packages add column if not exists billing text not null default 'MONTHLY';
alter table packages drop constraint if exists packages_billing_check;
alter table packages add constraint packages_billing_check check (billing in ('MONTHLY', 'BATCH'));
-- For BATCH packages classes_per_month means "classes in the whole batch" (up to 120).
alter table packages drop constraint if exists packages_classes_per_month_check;
alter table packages add constraint packages_classes_per_month_check check (classes_per_month between 1 and 120);

-- ---------------------------------------------------------------------------
-- Content subscription: one student, one class; from Class 9 also one group (SSC_SCIENCE, SSC_BUSINESS, ...)
-- ---------------------------------------------------------------------------
create table if not exists content_subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  segment            text not null check (segment in ('CLASS_6', 'CLASS_7', 'CLASS_8', 'SSC_SCIENCE', 'SSC_BUSINESS', 'SSC_HUMANITIES', 'HSC_SCIENCE', 'HSC_BUSINESS', 'HSC_HUMANITIES')),
  student_email      text not null,
  payer_email        text not null,
  price              int not null,
  status             text not null default 'PENDING' check (status in ('PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELLED')),
  auto_renew         boolean not null default true,
  agreement_id       text,
  payer_msisdn       text,
  current_period_end timestamptz,
  created_at         timestamptz not null default now()
);
create index if not exists content_subs_student on content_subscriptions (student_email, status);
create index if not exists content_subs_payer on content_subscriptions (payer_email);
create index if not exists content_subs_due on content_subscriptions (status, current_period_end);

-- ---------------------------------------------------------------------------
-- Classes held: one row per batch class per Dhaka day, written when the tutor joins.
-- ---------------------------------------------------------------------------
create table if not exists class_sessions (
  id          uuid primary key default gen_random_uuid(),
  class_id    text not null,
  batch_id    uuid references batches (id) on delete cascade,
  teacher_id  text not null,
  day         date not null,
  started_at  timestamptz not null default now(),
  status      text not null default 'OPEN' check (status in ('OPEN', 'RELEASED', 'EMPTY', 'HELD_BACK')),
  students    int,                              -- students who joined, counted at release
  released_at timestamptz,
  unique (class_id, day)
);
create index if not exists class_sessions_open on class_sessions (status, started_at);
create index if not exists class_sessions_teacher on class_sessions (teacher_id, status);

-- ---------------------------------------------------------------------------
-- Escrow: each paid month (or batch) of a package is a lot, released class by class.
-- ---------------------------------------------------------------------------
create table if not exists escrow_lots (
  id              uuid primary key default gen_random_uuid(),
  payment_id      uuid not null unique references payments (id),
  subscription_id uuid not null references subscriptions (id),
  batch_id        uuid references batches (id) on delete set null,
  teacher_id      text not null,
  teacher_email   text,
  student_email   text not null,
  gross           int not null,                -- list price of this month / batch
  classes         int not null check (classes > 0),
  released        int not null default 0,
  released_amount int not null default 0,      -- gross released so far (teacher + commission)
  starts_at       timestamptz not null default now(),
  ends_at         timestamptz not null,        -- classes after this do not draw on the lot
  status          text not null default 'OPEN' check (status in ('OPEN', 'DONE', 'EXPIRED', 'REFUNDED')),
  created_at      timestamptz not null default now()
);
create index if not exists escrow_lots_batch on escrow_lots (batch_id, status);
create index if not exists escrow_lots_teacher on escrow_lots (teacher_id, status);

-- Teacher wallet ledger: + earnings, − withdrawals, + reversals. Balance = sum(amount).
create table if not exists wallet_entries (
  id          bigint generated always as identity primary key,
  teacher_id  text not null,
  amount      int not null,
  kind        text not null check (kind in ('EARNING', 'WITHDRAWAL', 'REVERSAL', 'ADJUST')),
  ref         text not null,                   -- lot:session for earnings, withdrawal id otherwise
  gross       int,                             -- class share before commission
  commission  int,
  rate        numeric,
  note        text,
  created_at  timestamptz not null default now(),
  unique (kind, ref)
);
create index if not exists wallet_entries_teacher on wallet_entries (teacher_id, id desc);

create table if not exists teacher_wallets (       -- where payouts go
  teacher_id   text primary key,
  teacher_email text,
  bkash_number text,                           -- 01XXXXXXXXX
  auto_payout  boolean not null default false, -- send the whole balance every day automatically
  updated_at   timestamptz not null default now()
);

create table if not exists withdrawals (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   text not null,
  teacher_email text,
  amount       int not null check (amount > 0),
  msisdn       text not null,
  status       text not null default 'QUEUED' check (status in ('QUEUED', 'SENDING', 'PAID', 'FAILED')),
  trx_id       text,
  error        text,
  attempts     int not null default 0,
  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);
create index if not exists withdrawals_teacher on withdrawals (teacher_id, created_at desc);
create index if not exists withdrawals_status on withdrawals (status, created_at);

-- Take money out of the wallet safely: one request at a time per tutor, never more than the balance.
create or replace function request_withdrawal(t text, t_email text, amt int, num text, min_amt int default 50)
returns uuid language plpgsql as $$
declare bal int; wid uuid;
begin
  perform pg_advisory_xact_lock(hashtext('wallet:' || t));
  select coalesce(sum(amount), 0) into bal from wallet_entries where teacher_id = t;
  if amt is null or amt < min_amt or amt > bal then return null; end if;
  insert into withdrawals (teacher_id, teacher_email, amount, msisdn) values (t, t_email, amt, num) returning id into wid;
  insert into wallet_entries (teacher_id, amount, kind, ref) values (t, -amt, 'WITHDRAWAL', wid::text);
  return wid;
end $$;

create or replace function wallet_balance(t text) returns int language sql stable as $$
  select coalesce(sum(amount), 0)::int from wallet_entries where teacher_id = t;
$$;

-- Release one class of one lot exactly once (row lock on the lot).
create or replace function release_class(lot uuid, sess uuid, t text, teacher_amt int, commission_amt int, r numeric, is_last boolean)
returns boolean language plpgsql as $$
declare ok boolean;
begin
  update escrow_lots set released = released + 1, released_amount = released_amount + teacher_amt + commission_amt,
         status = case when is_last then 'DONE' else status end
   where id = lot and status = 'OPEN' and released < classes
     and not exists (select 1 from wallet_entries where kind = 'EARNING' and ref = lot::text || ':' || sess::text)
  returning true into ok;
  if not coalesce(ok, false) then return false; end if;
  insert into wallet_entries (teacher_id, amount, kind, ref, gross, commission, rate)
  values (t, teacher_amt, 'EARNING', lot::text || ':' || sess::text, teacher_amt + commission_amt, commission_amt, r);
  return true;
end $$;

-- ---------------------------------------------------------------------------
-- Routine change and rescheduling: tutor proposes, every student on the batch approves
-- ---------------------------------------------------------------------------
create table if not exists schedule_changes (
  id           uuid primary key default gen_random_uuid(),
  batch_id     uuid not null references batches (id) on delete cascade,
  teacher_id   text not null,
  kind         text not null check (kind in ('ROUTINE', 'RESCHEDULE')),
  new_schedule jsonb,                          -- ROUTINE: the whole new weekly schedule
  from_at      timestamptz,                    -- RESCHEDULE: the class being moved
  to_at        timestamptz,                    -- RESCHEDULE: its new time
  minutes      int,
  note         text,
  required     text[] not null default '{}',   -- students who must approve (batch list when proposed)
  status       text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED')),
  created_at   timestamptz not null default now(),
  decided_at   timestamptz,
  expires_at   timestamptz not null
);
create index if not exists schedule_changes_batch on schedule_changes (batch_id, created_at desc);
create index if not exists schedule_changes_pending on schedule_changes (status, expires_at);

create table if not exists schedule_votes (
  change_id uuid not null references schedule_changes (id) on delete cascade,
  email     text not null,
  vote      text not null check (vote in ('APPROVE', 'REJECT')),
  at        timestamptz not null default now(),
  primary key (change_id, email)
);

-- One-off moves that are approved: the class at cancelled_at happens at moved_to instead.
create table if not exists class_overrides (
  id           uuid primary key default gen_random_uuid(),
  batch_id     uuid not null references batches (id) on delete cascade,
  cancelled_at timestamptz not null,
  moved_to     timestamptz not null,
  minutes      int not null default 60,
  change_id    uuid references schedule_changes (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists class_overrides_batch on class_overrides (batch_id, moved_to);

alter table content_subscriptions enable row level security;
alter table class_sessions        enable row level security;
alter table escrow_lots           enable row level security;
alter table wallet_entries        enable row level security;
alter table teacher_wallets       enable row level security;
alter table withdrawals           enable row level security;
alter table schedule_changes      enable row level security;
alter table schedule_votes        enable row level security;
alter table class_overrides       enable row level security;

-- Expert badge (set by admin): the only way to the 5% commission tier.
alter table teacher_profiles add column if not exists expert boolean not null default false;

-- ---------------------------------------------------------------------------
-- Tutor verification: student ID card checked by AI, doubtful ones by admin.
-- Only verified tutors get platform content, and only their students get it free.
-- ---------------------------------------------------------------------------
alter table teacher_profiles add column if not exists verified boolean not null default false;

create table if not exists tutor_verifications (
  user_id      text primary key,
  email        text,
  profile_name text,
  front_path   text not null,                  -- class-files bucket, tutor-ids/<user>/front.*
  back_path    text,
  status       text not null default 'PENDING' check (status in ('PENDING', 'REVIEW', 'APPROVED', 'REJECTED')),
  ai           jsonb,                          -- what the AI read from the card
  note         text,                           -- admin's reason, shown to the tutor
  submitted_at timestamptz not null default now(),
  decided_at   timestamptz
);
create index if not exists tutor_verifications_status on tutor_verifications (status, submitted_at);
alter table tutor_verifications enable row level security;

-- ---------------------------------------------------------------------------
-- A student's class is fixed by their first ৳999 pack: the pack only ever opens
-- that class. Moving up a class (e.g. after the yearly exam) is done by an admin.
-- ---------------------------------------------------------------------------
create table if not exists student_segments (
  email    text primary key,
  segment  text not null check (segment in ('CLASS_6', 'CLASS_7', 'CLASS_8', 'SSC_SCIENCE', 'SSC_BUSINESS', 'SSC_HUMANITIES', 'HSC_SCIENCE', 'HSC_BUSINESS', 'HSC_HUMANITIES')),
  set_at   timestamptz not null default now(),
  set_by   text                                  -- null = first payment, else admin email
);
alter table student_segments enable row level security;

-- ---------------------------------------------------------------------------
-- Late tutor: half back only when the student complains (owner rule, Nov 17)
-- ---------------------------------------------------------------------------
alter table class_sessions add column if not exists late_min int;   -- tutor opened the room this many minutes after class time
alter table wallet_entries drop constraint if exists wallet_entries_kind_check;
alter table wallet_entries add constraint wallet_entries_kind_check check (kind in ('EARNING', 'WITHDRAWAL', 'REVERSAL', 'ADJUST', 'LATE_REFUND'));

create table if not exists class_complaints (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references class_sessions (id) on delete cascade,
  batch_id      uuid,
  teacher_id    text not null,
  student_email text not null,
  reason        text not null check (reason in ('TEACHER_LATE', 'ENDED_EARLY', 'POOR_TEACHING', 'BEHAVIOUR', 'OTHER')),
  details       text,
  late_min      int,
  status        text not null default 'REVIEW' check (status in ('REVIEW', 'REFUNDED', 'REJECTED')),
  refund        int,
  note          text,
  created_at    timestamptz not null default now(),
  decided_at    timestamptz,
  unique (session_id, student_email)
);
create index if not exists class_complaints_status on class_complaints (status, created_at);
create index if not exists class_complaints_student on class_complaints (student_email, created_at desc);
alter table class_complaints enable row level security;
