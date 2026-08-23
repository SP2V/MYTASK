-- Adds Google OAuth login (Supabase Auth) and scopes all data per-user.
--
-- BREAKING: this app was previously no-auth with fully public RLS policies
-- (see 0001_init.sql). Existing rows have no owner, so this migration wipes
-- tasks/categories/settings before adding ownership. Use the app's Export
-- Data button first if you have data worth keeping, then re-import it after
-- signing in with Google.
delete from tasks;
delete from categories;
delete from settings;

-- tasks / categories: one row per owning user, auto-stamped on insert via
-- the column default so existing insert code (which never sets user_id)
-- keeps working unchanged.
alter table categories
  add column user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table tasks
  add column user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;

create index if not exists categories_user_id_idx on categories (user_id);
create index if not exists tasks_user_id_idx on tasks (user_id);

-- settings: one row per user, keyed directly by the user's id (was a single
-- fixed 'app-settings' row shared by everyone).
alter table settings drop constraint settings_pkey;
alter table settings drop column id;
alter table settings
  add column id uuid not null default auth.uid() primary key references auth.users(id) on delete cascade;

drop policy "public full access" on categories;
drop policy "public full access" on tasks;
drop policy "public full access" on settings;

create policy "owner full access" on categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner full access" on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner full access" on settings
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Seed a settings row + the four default categories for every new user, so
-- the app works immediately after first Google sign-in with no manual setup.
-- security definer: runs as the table owner so it can bypass RLS to insert
-- rows on behalf of the just-created user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.settings (id) values (new.id)
  on conflict (id) do nothing;

  insert into public.categories (user_id, name, color, icon)
  values
    (new.id, 'Work', 'blue', 'Briefcase'),
    (new.id, 'Personal', 'violet', 'User'),
    (new.id, 'Study', 'green', 'BookOpen'),
    (new.id, 'Other', 'slate', 'Tag');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
