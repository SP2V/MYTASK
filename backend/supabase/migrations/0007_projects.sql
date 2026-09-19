-- Projects: a multi-step item where each step is tracked and checked off
-- individually until the whole project is complete.

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on projects (user_id);

alter table projects enable row level security;

create policy "owner full access" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists project_steps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  order_index integer not null default 0,
  is_done boolean not null default false,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_steps_project_id_idx on project_steps (project_id);
create index if not exists project_steps_user_id_idx on project_steps (user_id);

alter table project_steps enable row level security;

create policy "owner full access" on project_steps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
