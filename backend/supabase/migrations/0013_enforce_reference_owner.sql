-- RLS checks that every row's user_id is the caller, but a foreign key only
-- checks that the referenced row exists — for anyone. So a user who learned
-- another user's UUIDs could link their own task to someone else's project
-- or category, or claim another user's task_id in task_description_images
-- (its primary key), blocking the real owner from saving a screenshot.
--
-- These triggers require every reference to point at a row owned by the
-- same user. They run as security definer so the check sees rows regardless
-- of RLS (otherwise the answer would depend on who is asking). They only
-- re-check a reference when it, or the row's owner, actually changes; the
-- ON DELETE SET NULL cascades write NULL and are skipped.

create or replace function public.assert_owned(
  p_table regclass,
  p_id uuid,
  p_user_id uuid,
  p_label text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owned boolean;
begin
  if p_id is null then
    return;
  end if;
  execute format('select exists (select 1 from %s where id = $1 and user_id = $2)', p_table)
    into owned
    using p_id, p_user_id;
  if not owned then
    raise exception '% % does not exist or belongs to another user', p_label, p_id
      using errcode = '23503';
  end if;
end;
$$;

revoke all on function public.assert_owned(regclass, uuid, uuid, text) from public, anon, authenticated;

-- tasks.category_id / tasks.project_id
create or replace function public.enforce_task_reference_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT'
     or new.category_id is distinct from old.category_id
     or new.user_id is distinct from old.user_id then
    perform public.assert_owned('public.categories', new.category_id, new.user_id, 'Category');
  end if;
  if tg_op = 'INSERT'
     or new.project_id is distinct from old.project_id
     or new.user_id is distinct from old.user_id then
    perform public.assert_owned('public.projects', new.project_id, new.user_id, 'Project');
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_enforce_reference_owner on public.tasks;
create trigger tasks_enforce_reference_owner
  before insert or update of category_id, project_id, user_id on public.tasks
  for each row execute function public.enforce_task_reference_owner();

-- project_steps.project_id
create or replace function public.enforce_project_step_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_owned('public.projects', new.project_id, new.user_id, 'Project');
  return new;
end;
$$;

drop trigger if exists project_steps_enforce_owner on public.project_steps;
create trigger project_steps_enforce_owner
  before insert or update of project_id, user_id on public.project_steps
  for each row execute function public.enforce_project_step_owner();

-- task_description_images.task_id
create or replace function public.enforce_task_image_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_owned('public.tasks', new.task_id, new.user_id, 'Task');
  return new;
end;
$$;

drop trigger if exists task_description_images_enforce_owner on public.task_description_images;
create trigger task_description_images_enforce_owner
  before insert or update of task_id, user_id on public.task_description_images
  for each row execute function public.enforce_task_image_owner();

-- settings.default_category_id (settings.id is the owning user's id)
create or replace function public.enforce_settings_category_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT'
     or new.default_category_id is distinct from old.default_category_id then
    perform public.assert_owned('public.categories', new.default_category_id, new.id, 'Category');
  end if;
  return new;
end;
$$;

drop trigger if exists settings_enforce_category_owner on public.settings;
create trigger settings_enforce_category_owner
  before insert or update of default_category_id on public.settings
  for each row execute function public.enforce_settings_category_owner();
