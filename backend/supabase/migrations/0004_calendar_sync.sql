-- Google Calendar sync: stores each user's Google OAuth refresh token (captured
-- client-side after they opt in via "Connect Google Calendar" in Settings) and
-- tracks which Calendar event backs each task.
--
-- Sync itself is NOT driven by a DB trigger — the frontend calls the
-- `sync-google-calendar` Edge Function directly after each task create/update/
-- delete (see frontend/src/features/settings/services/google-calendar-sync.ts).
-- That keeps this migration simple (no pg_net, no loop-guarding against the
-- function's own write-back of google_event_id) and keeps calendar sync a
-- best-effort side effect that never blocks task CRUD.

create table if not exists google_calendar_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  access_token text,
  access_token_expires_at timestamptz,
  calendar_id text not null default 'primary',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table google_calendar_tokens enable row level security;

create policy "owner full access" on google_calendar_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table tasks add column google_event_id text;
