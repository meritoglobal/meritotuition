-- Mastermoshai admin panel (Nov 2026). Run AFTER class-tools.sql, growth.sql and business.sql.
-- Safe to run more than once.

-- Extra admins added from the panel (ADMIN_EMAILS in Netlify stay as the owners).
create table if not exists admin_users (
  email      text primary key,
  added_by   text,
  created_at timestamptz not null default now()
);

-- Every admin action, for "who did what".
create table if not exists admin_log (
  id          bigint generated always as identity primary key,
  admin_email text not null,
  action      text not null,
  target      text,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists admin_log_at on admin_log (created_at desc);

-- Suspended accounts. The site treats them as signed out; Supabase login is banned too.
create table if not exists account_blocks (
  email      text primary key,
  user_id    text,
  reason     text,
  blocked_by text,
  created_at timestamptz not null default now()
);
create index if not exists account_blocks_user on account_blocks (user_id);

-- Settings the admin can change without a code change (commission tiers, content price, site notice).
create table if not exists platform_settings (
  key        text primary key,
  value      jsonb not null,
  updated_by text,
  updated_at timestamptz not null default now()
);

-- Hide a tutor from search and new requests without deleting anything.
alter table teacher_profiles add column if not exists hidden boolean not null default false;

alter table admin_users       enable row level security;
alter table admin_log         enable row level security;
alter table account_blocks    enable row level security;
alter table platform_settings enable row level security;

-- Search login accounts (auth.users) from the panel. Only the server's secret key may call these.
create or replace function admin_find_users(q text default '', lim int default 50, off int default 0)
returns table (id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, banned_until timestamptz, total bigint)
language sql security definer set search_path = public, auth as $$
  select u.id, u.email::text, u.created_at, u.last_sign_in_at, u.banned_until, count(*) over () as total
  from auth.users u
  where coalesce(q, '') = '' or u.email ilike '%' || q || '%' or u.id::text = q
  order by u.created_at desc
  limit greatest(1, least(lim, 500)) offset greatest(0, off);
$$;

create or replace function admin_user_stats()
returns table (total bigint, today bigint, week bigint, active_week bigint)
language sql security definer set search_path = public, auth as $$
  select count(*),
         count(*) filter (where created_at > now() - interval '1 day'),
         count(*) filter (where created_at > now() - interval '7 days'),
         count(*) filter (where last_sign_in_at > now() - interval '7 days')
  from auth.users;
$$;

create or replace function admin_all_emails()
returns table (email text)
language sql security definer set search_path = public, auth as $$
  select u.email::text from auth.users u where u.email is not null;
$$;

revoke all on function admin_find_users(text, int, int) from public, anon, authenticated;
revoke all on function admin_user_stats() from public, anon, authenticated;
revoke all on function admin_all_emails() from public, anon, authenticated;
grant execute on function admin_find_users(text, int, int) to service_role;
grant execute on function admin_user_stats() to service_role;
grant execute on function admin_all_emails() to service_role;
