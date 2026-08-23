-- Adds email reminder delivery: a per-user preference flag, a per-task guard
-- against duplicate sends, and the extensions needed to run the sender on a
-- schedule. Actual sending happens in the `send-reminder-emails` Edge
-- Function — see backend/README.md for deploy + scheduling steps.

alter table settings add column email_notifications_enabled boolean not null default false;
alter table tasks add column reminder_sent_at timestamptz;

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- If a task's due date/time/reminder is edited after a reminder email was
-- already sent, clear the guard so a fresh due moment can trigger a new one.
create or replace function public.reset_reminder_sent_at()
returns trigger
language plpgsql
as $$
begin
  if (new.due_date is distinct from old.due_date)
     or (new.due_time is distinct from old.due_time)
     or (new.reminder is distinct from old.reminder) then
    new.reminder_sent_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_reset_reminder_sent_at on tasks;
create trigger tasks_reset_reminder_sent_at
  before update on tasks
  for each row execute function public.reset_reminder_sent_at();
