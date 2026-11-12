-- Mastermoshai: class files, exams and submissions.
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.
-- The website talks to these tables only from the server (secret key), so
-- row level security is switched on with no public policies.

create table if not exists class_materials (
  id          uuid primary key default gen_random_uuid(),
  class_id    text not null,
  title       text not null,
  path        text not null,
  size_bytes  bigint,
  mime        text,
  uploaded_by text not null,
  created_at  timestamptz not null default now()
);
create index if not exists class_materials_class on class_materials (class_id, created_at desc);

create table if not exists exams (
  id           uuid primary key default gen_random_uuid(),
  class_id     text not null,
  title        text not null,
  instructions text,
  duration_min int check (duration_min is null or duration_min between 1 and 600),
  questions    jsonb not null,          -- ExamQuestion[] incl. answer key; never sent to students as-is
  max_marks    numeric not null,
  published    boolean not null default false,
  created_by   text not null,
  created_at   timestamptz not null default now()
);
create index if not exists exams_class on exams (class_id, created_at desc);

create table if not exists exam_submissions (
  id           uuid primary key default gen_random_uuid(),
  exam_id      uuid not null references exams (id) on delete cascade,
  student_id   text not null,
  student_name text,
  answers      jsonb not null,
  auto_score   numeric not null,
  manual       jsonb not null default '{}'::jsonb,
  total        numeric not null,
  checked      boolean not null default false,
  submitted_at timestamptz not null default now(),
  checked_at   timestamptz,
  unique (exam_id, student_id)
);
create index if not exists exam_submissions_exam on exam_submissions (exam_id, submitted_at);

alter table class_materials  enable row level security;
alter table exams            enable row level security;
alter table exam_submissions enable row level security;

-- Private bucket for class files and recordings (max 100 MB a file).
insert into storage.buckets (id, name, public, file_size_limit)
values ('class-files', 'class-files', false, 104857600)
on conflict (id) do nothing;
