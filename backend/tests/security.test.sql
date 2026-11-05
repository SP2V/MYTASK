-- Assertions for 0012 (write-only Google token) and 0013 (references must
-- belong to the same user). Each block raises on failure; the runner stops at
-- the first error. Run via run-migration-tests.sh.

insert into auth.users (id) values
  ('aaaaaaaa-0000-0000-0000-000000000001'),  -- alice
  ('bbbbbbbb-0000-0000-0000-000000000002');  -- bob

-- ---------------------------------------------------------------------------
-- Bob's data
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
set role authenticated;

insert into categories (id, name) values ('bbbbbbbb-0000-0000-0000-0000000000c1', 'Bob category');
insert into projects (id, title) values ('bbbbbbbb-0000-0000-0000-0000000000a1', 'Bob project');
insert into tasks (id, title, category_id, project_id)
  values ('bbbbbbbb-0000-0000-0000-0000000000f1', 'Bob task',
          'bbbbbbbb-0000-0000-0000-0000000000c1', 'bbbbbbbb-0000-0000-0000-0000000000a1');
insert into project_steps (project_id, title) values ('bbbbbbbb-0000-0000-0000-0000000000a1', 'Bob step');
insert into task_description_images (task_id, image_data)
  values ('bbbbbbbb-0000-0000-0000-0000000000f1', 'data:image/png;base64,AAAA');
update settings set default_category_id = 'bbbbbbbb-0000-0000-0000-0000000000c1'
  where id = 'bbbbbbbb-0000-0000-0000-000000000002';

reset role;

-- ---------------------------------------------------------------------------
-- 0013: Alice cannot point her rows at Bob's
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
set role authenticated;

insert into categories (id, name) values ('aaaaaaaa-0000-0000-0000-0000000000c1', 'Alice category');
insert into projects (id, title) values ('aaaaaaaa-0000-0000-0000-0000000000a1', 'Alice project');
insert into tasks (id, title) values ('aaaaaaaa-0000-0000-0000-0000000000f1', 'Alice task');
insert into settings (id) values ('aaaaaaaa-0000-0000-0000-000000000001') on conflict do nothing;

do $$ begin
  insert into tasks (title, project_id) values ('steal', 'bbbbbbbb-0000-0000-0000-0000000000a1');
  raise exception 'FAIL: task linked to another user''s project';
exception when foreign_key_violation then null; end $$;

do $$ begin
  insert into tasks (title, category_id) values ('steal', 'bbbbbbbb-0000-0000-0000-0000000000c1');
  raise exception 'FAIL: task linked to another user''s category';
exception when foreign_key_violation then null; end $$;

do $$ begin
  update tasks set project_id = 'bbbbbbbb-0000-0000-0000-0000000000a1'
    where id = 'aaaaaaaa-0000-0000-0000-0000000000f1';
  raise exception 'FAIL: task re-linked to another user''s project';
exception when foreign_key_violation then null; end $$;

do $$ begin
  insert into project_steps (project_id, title) values ('bbbbbbbb-0000-0000-0000-0000000000a1', 'steal');
  raise exception 'FAIL: step added to another user''s project';
exception when foreign_key_violation then null; end $$;

do $$ begin
  -- Bob's task already has an image, so use one without: claim a fresh id.
  insert into task_description_images (task_id, image_data)
    values ('bbbbbbbb-0000-0000-0000-0000000000f1', 'data:image/png;base64,BBBB')
    on conflict (task_id) do nothing;
  raise exception 'FAIL: image attached to another user''s task';
exception when foreign_key_violation then null; end $$;

do $$ begin
  update settings set default_category_id = 'bbbbbbbb-0000-0000-0000-0000000000c1'
    where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  raise exception 'FAIL: default category set to another user''s category';
exception when foreign_key_violation then null; end $$;

-- Her own references still work.
update tasks set category_id = 'aaaaaaaa-0000-0000-0000-0000000000c1',
                 project_id = 'aaaaaaaa-0000-0000-0000-0000000000a1'
  where id = 'aaaaaaaa-0000-0000-0000-0000000000f1';
insert into project_steps (project_id, title) values ('aaaaaaaa-0000-0000-0000-0000000000a1', 'Alice step');
insert into task_description_images (task_id, image_data)
  values ('aaaaaaaa-0000-0000-0000-0000000000f1', 'data:image/png;base64,CCCC');
update settings set default_category_id = 'aaaaaaaa-0000-0000-0000-0000000000c1'
  where id = 'aaaaaaaa-0000-0000-0000-000000000001';
-- Updating unrelated columns doesn't re-trigger the checks.
update tasks set title = 'Alice task renamed' where id = 'aaaaaaaa-0000-0000-0000-0000000000f1';

-- ON DELETE SET NULL cascades still work through the triggers.
delete from projects where id = 'aaaaaaaa-0000-0000-0000-0000000000a1';
delete from categories where id = 'aaaaaaaa-0000-0000-0000-0000000000c1';
do $$ begin
  if exists (select 1 from tasks where id = 'aaaaaaaa-0000-0000-0000-0000000000f1'
             and (project_id is not null or category_id is not null)) then
    raise exception 'FAIL: cascade did not null the references';
  end if;
  if (select default_category_id from settings where id = 'aaaaaaaa-0000-0000-0000-000000000001') is not null then
    raise exception 'FAIL: cascade did not null the default category';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 0012: the refresh token is write-only for the browser
do $$ begin perform save_google_calendar_token('alice-refresh-token'); end $$;

do $$ begin
  if not exists (select 1 from google_calendar_tokens) then
    raise exception 'FAIL: connection check (select user_id) should see the row';
  end if;
end $$;

do $$ begin
  perform refresh_token from google_calendar_tokens;
  raise exception 'FAIL: browser could read refresh_token';
exception when insufficient_privilege then null; end $$;

do $$ begin
  perform access_token from google_calendar_tokens;
  raise exception 'FAIL: browser could read access_token';
exception when insufficient_privilege then null; end $$;

do $$ begin
  insert into google_calendar_tokens (user_id, refresh_token)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'direct-write');
  raise exception 'FAIL: browser could write the table directly';
exception when insufficient_privilege then null; end $$;

-- Re-saving replaces the token and clears the cached access token.
do $$ begin perform save_google_calendar_token('alice-refresh-token-2'); end $$;

reset role;
do $$ begin
  if (select refresh_token from google_calendar_tokens
      where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') <> 'alice-refresh-token-2' then
    raise exception 'FAIL: token not replaced';
  end if;
end $$;

-- Bob sees no row of Alice's; disconnect only removes his own (none).
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
set role authenticated;
do $$ begin
  if exists (select 1 from google_calendar_tokens) then
    raise exception 'FAIL: Bob can see Alice''s connection';
  end if;
end $$;
delete from google_calendar_tokens where user_id is not null;
reset role;
do $$ begin
  if not exists (select 1 from google_calendar_tokens) then
    raise exception 'FAIL: Bob deleted Alice''s connection';
  end if;
end $$;

-- Alice can disconnect.
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
set role authenticated;
delete from google_calendar_tokens where user_id is not null;
reset role;
do $$ begin
  if exists (select 1 from google_calendar_tokens) then
    raise exception 'FAIL: disconnect did not delete the row';
  end if;
end $$;

-- Anonymous callers can't save tokens at all.
set request.jwt.claim.sub = '';
set role anon;
do $$ begin
  perform save_google_calendar_token('anon-token');
  raise exception 'FAIL: anon could call save_google_calendar_token';
exception when insufficient_privilege then null; end $$;
reset role;

\echo 'security.test.sql: all assertions passed'
