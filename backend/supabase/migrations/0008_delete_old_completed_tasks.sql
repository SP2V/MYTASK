-- Permanently remove completed tasks after they have been completed for 30 days.
-- pg_cron is enabled by migration 0003_email_reminders.sql.

select cron.schedule(
  'delete-old-completed-tasks',
  '0 3 * * *',
  $job$
    delete from public.tasks
    where status = 'COMPLETED'
      and completed_at < now() - interval '30 days';
  $job$
);
