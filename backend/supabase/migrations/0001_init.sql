-- Personal Task Manager — initial schema
-- Single-user, no-auth app: RLS is enabled but the policies below intentionally
-- allow full read/write to anyone holding the anon key. See backend/README.md
-- for the security tradeoff this implies before deploying.

create extension if not exists pgcrypto;

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text,
  color text not null default 'slate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'TODO'
    check (status in ('TODO', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED')),
  priority text not null default 'MEDIUM'
    check (priority in ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  category_id uuid references categories(id) on delete set null,
  due_date date,
  due_time time,
  completed_at timestamptz,
  recurrence jsonb,
  reminder jsonb,
  notes text,
  series_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_status_idx on tasks (status);
create index if not exists tasks_category_id_idx on tasks (category_id);
create index if not exists tasks_due_date_idx on tasks (due_date);

create table if not exists settings (
  id text primary key default 'app-settings',
  theme text not null default 'SYSTEM'
    check (theme in ('SYSTEM', 'LIGHT', 'DARK')),
  default_priority text not null default 'MEDIUM'
    check (default_priority in ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  default_category_id uuid references categories(id) on delete set null,
  week_starts_on int not null default 0 check (week_starts_on between 0 and 6),
  date_format text not null default 'MDY' check (date_format in ('MDY', 'DMY', 'YMD')),
  time_format text not null default 'H12' check (time_format in ('H12', 'H24')),
  notifications_enabled boolean not null default false
);

alter table categories enable row level security;
alter table tasks enable row level security;
alter table settings enable row level security;

-- No-auth, single-user app: allow the anon key full access to all rows.
create policy "public full access" on categories
  for all using (true) with check (true);
create policy "public full access" on tasks
  for all using (true) with check (true);
create policy "public full access" on settings
  for all using (true) with check (true);
