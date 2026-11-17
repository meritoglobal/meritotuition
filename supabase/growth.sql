-- Mastermoshai: guardians and weekly reports, chat, monthly packages + bKash,
-- referrals and coupons, SSC model tests, photo questions, tuition requests and bids.
-- Paste into Supabase → SQL Editor → Run, after class-tools.sql. Safe to run more than once.
-- Like class-tools.sql, the website reaches these tables only from the server
-- (secret key), so row level security is on with no public policies.
-- People are identified by their login email (lower case), the same key batch_students uses.

-- ---------------------------------------------------------------------------
-- Attendance: one row per student per class day, written when they join.
-- ---------------------------------------------------------------------------
create table if not exists class_attendance (
  class_id  text not null,
  email     text not null,
  day       date not null,
  joined_at timestamptz not null default now(),
  primary key (class_id, email, day)
);
create index if not exists class_attendance_email on class_attendance (email, day desc);

-- ---------------------------------------------------------------------------
-- Guardians
-- ---------------------------------------------------------------------------
create table if not exists guardian_codes (      -- a student shares this code with a parent
  code          text primary key,
  student_email text not null,
  student_id    text,                          -- login user id (exam marks are stored by it)
  expires_at    timestamptz not null
);
create index if not exists guardian_codes_student on guardian_codes (student_email);

create table if not exists guardian_links (
  guardian_email text not null,
  student_email  text not null,
  student_id     text,
  student_name   text,
  weekly_email   boolean not null default true,
  created_at     timestamptz not null default now(),
  primary key (guardian_email, student_email)
);
create index if not exists guardian_links_student on guardian_links (student_email);

create table if not exists progress_notes (      -- the tutor's weekly line about a student
  id            uuid primary key default gen_random_uuid(),
  batch_id      uuid not null references batches (id) on delete cascade,
  student_email text not null,
  teacher_id    text not null,
  week_start    date not null,                 -- Saturday of the Dhaka week
  rating        int check (rating between 1 and 5),
  note          text not null,
  created_at    timestamptz not null default now(),
  unique (batch_id, student_email, week_start)
);
create index if not exists progress_notes_student on progress_notes (student_email, week_start desc);

-- ---------------------------------------------------------------------------
-- Chat (contact details are masked before a message is stored)
-- ---------------------------------------------------------------------------
create table if not exists chat_threads (
  id          uuid primary key default gen_random_uuid(),
  a_email     text not null,                   -- a_email < b_email, so a pair has one thread
  b_email     text not null,
  a_name      text,
  b_name      text,
  last_text   text,
  last_at     timestamptz not null default now(),
  a_read_at   timestamptz not null default now(),
  b_read_at   timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (a_email, b_email),
  check (a_email < b_email)
);
create index if not exists chat_threads_a on chat_threads (a_email, last_at desc);
create index if not exists chat_threads_b on chat_threads (b_email, last_at desc);

create table if not exists chat_messages (
  id           bigint generated always as identity primary key,
  thread_id    uuid not null references chat_threads (id) on delete cascade,
  sender_email text not null,
  body         text not null,
  masked       boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists chat_messages_thread on chat_messages (thread_id, id);

-- In-app notifications; the app opens `path` when one is tapped.
create table if not exists app_notifications (
  id         bigint generated always as identity primary key,
  email      text not null,
  kind       text not null,
  title      text not null,
  body       text,
  path       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists app_notifications_email on app_notifications (email, id desc);

-- ---------------------------------------------------------------------------
-- Monthly packages, subscriptions and payments (bKash)
-- ---------------------------------------------------------------------------
create table if not exists packages (
  id                uuid primary key default gen_random_uuid(),
  teacher_id        text not null,
  teacher_email     text,
  teacher_name      text,
  batch_id          uuid references batches (id) on delete set null,  -- paying puts the student on this batch
  title             text not null,
  subject           text not null,
  level             text not null,
  days_per_week     int not null check (days_per_week between 1 and 7),
  classes_per_month int not null check (classes_per_month between 1 and 40),
  price             int not null check (price between 100 and 100000),  -- taka per month
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);
create index if not exists packages_teacher on packages (teacher_id, created_at desc);

create table if not exists subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  package_id         uuid not null references packages (id),
  student_email      text not null,
  payer_email        text not null,
  status             text not null default 'PENDING' check (status in ('PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELLED')),
  auto_renew         boolean not null default true,
  agreement_id       text,                     -- bKash tokenized agreement (saved wallet)
  payer_msisdn       text,                     -- masked wallet number from bKash, for display
  current_period_end timestamptz,
  created_at         timestamptz not null default now()
);
create index if not exists subscriptions_student on subscriptions (student_email);
create index if not exists subscriptions_payer on subscriptions (payer_email);
create index if not exists subscriptions_due on subscriptions (status, current_period_end);

create table if not exists payments (
  id              uuid primary key default gen_random_uuid(),
  purpose         text not null check (purpose in ('PACKAGE', 'TEST', 'DOUBT')),
  ref_id          text not null,               -- subscription id, model test id or doubt id
  payer_email     text not null,
  list_price      int not null,
  discount        int not null default 0,
  credit_used     int not null default 0,
  amount          int not null,                -- what bKash charges
  coupon_code     text,
  status          text not null default 'CREATED' check (status in ('CREATED', 'PAID', 'FAILED', 'CANCELLED')),
  bkash_payment_id text unique,
  trx_id          text,
  mode            text,                        -- 0011 one-off, 0000 save wallet, 0001 pay with saved wallet
  created_at      timestamptz not null default now(),
  paid_at         timestamptz
);
create index if not exists payments_ref on payments (purpose, ref_id);
create index if not exists payments_payer on payments (payer_email, created_at desc);

-- ---------------------------------------------------------------------------
-- Referrals, credit and coupons
-- ---------------------------------------------------------------------------
create table if not exists referral_codes (
  email text primary key,
  code  text not null unique
);

create table if not exists referrals (
  referee_email  text primary key,             -- someone can be referred once
  referrer_email text not null,
  status         text not null default 'JOINED' check (status in ('JOINED', 'REWARDED')),
  created_at     timestamptz not null default now(),
  rewarded_at    timestamptz
);
create index if not exists referrals_referrer on referrals (referrer_email);

create table if not exists credits (            -- ledger: + earned, - spent
  id         bigint generated always as identity primary key,
  email      text not null,
  amount     int not null,
  reason     text not null,
  ref        text,
  created_at timestamptz not null default now()
);
create index if not exists credits_email on credits (email);

create table if not exists coupons (
  code        text primary key,                -- upper case
  percent_off int check (percent_off between 1 and 100),
  amount_off  int check (amount_off > 0),
  max_uses    int,
  used        int not null default 0,
  expires_at  timestamptz,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  check (percent_off is not null or amount_off is not null)
);

-- Count a coupon use only while it is still under its limit.
create or replace function use_coupon(c text) returns boolean language sql as $$
  update coupons set used = used + 1
  where code = c and active and (max_uses is null or used < max_uses) and (expires_at is null or expires_at > now())
  returning true;
$$;

-- ---------------------------------------------------------------------------
-- SSC model tests and leaderboard
-- ---------------------------------------------------------------------------
create table if not exists model_tests (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  subject      text not null,
  level        text not null default 'SSC',
  questions    jsonb not null,                 -- ExamQuestion[] (MCQ), answer key never sent before submit
  duration_min int not null default 20 check (duration_min between 1 and 300),
  price        int not null default 0,         -- 0 = free
  opens_at     timestamptz not null default now(),
  closes_at    timestamptz,
  published    boolean not null default true,
  created_by   text not null,
  created_at   timestamptz not null default now()
);
create index if not exists model_tests_open on model_tests (published, opens_at desc);

create table if not exists model_test_attempts (
  test_id      uuid not null references model_tests (id) on delete cascade,
  email        text not null,
  name         text,
  school       text,
  started_at   timestamptz not null default now(),
  answers      jsonb,
  score        numeric,
  max_score    numeric,
  time_sec     int,
  submitted_at timestamptz,
  primary key (test_id, email)
);
create index if not exists model_test_rank on model_test_attempts (test_id, score desc, time_sec asc);

-- ---------------------------------------------------------------------------
-- Photo questions: AI answers first, a paid tutor if the student asks
-- ---------------------------------------------------------------------------
create table if not exists doubts (
  id            uuid primary key default gen_random_uuid(),
  asker_email   text not null,
  subject       text not null,
  level         text not null,
  text          text,
  image_path    text,                          -- in the class-files bucket under doubts/
  ai_answer     text,
  status        text not null default 'AI' check (status in ('AI', 'WAITING_PAYMENT', 'OPEN', 'CLAIMED', 'ANSWERED')),
  tutor_email   text,
  tutor_name    text,
  tutor_answer  text,
  price         int,
  claimed_at    timestamptz,
  answered_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists doubts_asker on doubts (asker_email, created_at desc);
create index if not exists doubts_open on doubts (status, created_at);

alter table class_attendance    enable row level security;
alter table guardian_codes      enable row level security;
alter table guardian_links      enable row level security;
alter table progress_notes      enable row level security;
alter table chat_threads        enable row level security;
alter table chat_messages       enable row level security;
alter table app_notifications   enable row level security;
alter table packages            enable row level security;
alter table subscriptions       enable row level security;
alter table payments            enable row level security;
alter table referral_codes      enable row level security;
alter table referrals           enable row level security;
alter table credits             enable row level security;
alter table coupons             enable row level security;
alter table model_tests         enable row level security;
alter table model_test_attempts enable row level security;
alter table doubts              enable row level security;

-- ---------------------------------------------------------------------------
-- Tuition requests: a student posts what they need, matching tutors are told,
-- tutors bid, the student picks one (or invites a tutor who is open to students)
-- ---------------------------------------------------------------------------
create table if not exists tuition_requests (
  id            uuid primary key default gen_random_uuid(),
  student_email text not null,
  student_name  text,
  subject       text not null,
  level         text not null,
  mode          text not null check (mode in ('HOME', 'ONLINE')),
  area          text,                          -- Dhaka area, for home tuition
  budget        int not null check (budget between 500 and 100000),  -- taka per month
  days_per_week int not null default 3 check (days_per_week between 1 and 7),
  note          text,
  status        text not null default 'OPEN' check (status in ('OPEN', 'MATCHED', 'CLOSED')),
  chosen_bid    uuid,
  notified      int not null default 0,        -- tutors told when it was posted
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '14 days'
);
create index if not exists tuition_requests_open on tuition_requests (status, created_at desc);
create index if not exists tuition_requests_student on tuition_requests (student_email, created_at desc);

create table if not exists request_bids (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references tuition_requests (id) on delete cascade,
  teacher_id    text not null,
  teacher_email text not null,
  teacher_name  text,
  price         int not null check (price between 500 and 100000),
  message       text,
  status        text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN')),
  created_at    timestamptz not null default now(),
  unique (request_id, teacher_id)
);
create index if not exists request_bids_teacher on request_bids (teacher_id, created_at desc);

create table if not exists request_invites (     -- student asked this tutor to look at the request
  request_id uuid not null references tuition_requests (id) on delete cascade,
  teacher_id text not null,
  created_at timestamptz not null default now(),
  primary key (request_id, teacher_id)
);

create table if not exists teacher_request_prefs (  -- the tutor's own filter for new requests
  user_id     text primary key,
  open        boolean not null default true,       -- shown to students as "open to new students"
  notify      boolean not null default true,
  min_budget  int,
  extra_areas text[] not null default '{}',        -- areas beyond the profile's home radius
  updated_at  timestamptz not null default now()
);

alter table tuition_requests      enable row level security;
alter table request_bids          enable row level security;
alter table request_invites       enable row level security;
alter table teacher_request_prefs enable row level security;

