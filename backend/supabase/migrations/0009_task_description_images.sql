-- Stores one compressed, pasted screenshot per task. Keeping it in a separate
-- row avoids inflating normal task reads; deleting a task also deletes its image.

create table if not exists public.task_description_images (
  task_id uuid primary key references public.tasks(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  image_data text not null
    check (image_data ~ '^data:image/(webp|png|jpeg);base64,'),
  created_at timestamptz not null default now(),
  check (octet_length(image_data) <= 3000000)
);

alter table public.task_description_images enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'task_description_images'
      and policyname = 'owner full access'
  ) then
    create policy "owner full access" on public.task_description_images
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end;
$$;
