-- Just enough of Supabase's environment to apply this project's migrations to
-- a plain local Postgres for testing: the API roles, auth.users/auth.uid(),
-- Supabase's default grants, and no-op stand-ins for pg_cron.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (id uuid primary key);

-- Supabase derives auth.uid() from the request JWT; tests set it directly.
create function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- Supabase grants table/function access to the API roles by default and
-- relies on RLS (and explicit revokes) for protection.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

create schema cron;
create function cron.schedule(job_name text, schedule text, command text) returns bigint
language sql as $$ select 1::bigint $$;
create function cron.unschedule(job_name text) returns boolean
language sql as $$ select true $$;
