-- Post-it notes: a lightweight scratch board, stored separately from tasks
-- since notes here have no status/priority/due date — just free-form text.

create table if not exists postits (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  color text not null default 'yellow'
    check (color in ('yellow', 'pink', 'sky', 'lime', 'orange', 'violet')),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists postits_user_id_idx on postits (user_id);

alter table postits enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'postits'
      and policyname = 'owner full access'
  ) then
    create policy "owner full access" on postits
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end;
$$;
