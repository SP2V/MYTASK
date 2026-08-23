-- Removes browser notifications, email reminders, and the per-task reminder
-- field — the feature was never used and is being dropped entirely.

drop trigger if exists tasks_reset_reminder_sent_at on tasks;
drop function if exists public.reset_reminder_sent_at();

alter table settings drop column if exists notifications_enabled;
alter table settings drop column if exists email_notifications_enabled;
alter table tasks drop column if exists reminder;
alter table tasks drop column if exists reminder_sent_at;

-- Unschedule the send-reminder-emails cron job if it was set up via
-- cron_setup.sql.example (no-op if it was never scheduled).
do $$
begin
  perform cron.unschedule('send-reminder-emails');
exception
  when others then null;
end $$;
