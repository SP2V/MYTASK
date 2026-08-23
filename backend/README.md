# Backend — Supabase

This app has no custom server for its data layer. "Backend" here is the
Supabase Postgres schema the frontend talks to directly via
`@supabase/supabase-js`, plus one Edge Function that sends reminder emails.

## Auth

The app uses **Supabase Auth with Google as the only sign-in method**. Every
row in `tasks`, `categories`, and `settings` is scoped to the signed-in user
via Row Level Security (`auth.uid()`) — nobody can see or modify another
user's data, and the anon key alone grants no access to any table.

> Earlier versions of this app were no-login/single-user with fully public
> RLS policies. Migration `0002_auth.sql` **wipes existing
> tasks/categories/settings** when adding ownership, since there's no owner
> to backfill. Export your data first (Settings → Export Data) if you have
> anything worth keeping, then re-import it after signing in.

## Setup

1. Create a project at [supabase.com](https://supabase.com) (or run the Supabase CLI
   locally: `supabase init && supabase start`).
2. Open the SQL Editor in the Supabase dashboard and run, in order:
   - `supabase/migrations/0001_init.sql` — creates `tasks`, `categories`, `settings`
   - `supabase/migrations/0002_auth.sql` — adds per-user ownership + RLS + the
     new-user seeding trigger
   - `supabase/migrations/0003_email_reminders.sql` — adds the email-reminder
     preference flag and dedup tracking
   - `supabase/migrations/0004_calendar_sync.sql` — adds Google Calendar token
     storage and the `tasks.google_event_id` link column
   (Or, with the Supabase CLI: `supabase db push`.)
3. **Enable the Google provider:**
   - In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
     create an OAuth 2.0 Client ID (Web application). Add this Authorized
     redirect URI (find your project ref in Project Settings → General):
     `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - In the Supabase dashboard, go to **Authentication → Sign In / Providers → Google**,
     enable it, and paste the Client ID and Client Secret from Google Cloud Console.
   - In **Authentication → URL Configuration**, set **Site URL** to your app's
     URL (e.g. `http://localhost:5173` for local dev) and add it to **Redirect URLs**
     too — Supabase redirects back here after Google sign-in.
4. In the Supabase dashboard, go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key
5. In `frontend/`, copy `.env.example` to `.env` and fill in those two values:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
6. `cd frontend && npm run dev`, then sign in with Google.

## Email reminders (optional)

Browser notifications (`Settings → Notifications`) only fire while the app
tab is open. Email reminders fire server-side on a schedule, independent of
whether the app is open, via the `send-reminder-emails` Edge Function +
[Resend](https://resend.com).

1. Create a free Resend account, verify a sending domain (or use their
   sandbox `onboarding@resend.dev` address for testing), and grab an API key.
2. Deploy the function:
   ```
   supabase functions deploy send-reminder-emails
   ```
3. Set its secrets:
   ```
   supabase secrets set RESEND_API_KEY=re_xxx
   supabase secrets set RESEND_FROM="Task Manager <reminders@yourdomain.com>"
   ```
4. Schedule it: copy `supabase/cron_setup.sql.example`, fill in your project
   ref and **service role key** (Project Settings → API), and run it once in
   the SQL Editor. This uses `pg_cron` + `pg_net` (enabled by
   `0003_email_reminders.sql`) to call the function every 5 minutes.
5. In the app, toggle **Settings → Notifications → Email reminders** on. Any
   task with a reminder enabled and a due date will get emailed once its
   reminder window opens.

The service role key used in step 4 bypasses RLS — that's expected, it lets
the scheduled function read every user's due tasks to send reminders. Never
put the service role key in the frontend `.env` or commit
`cron_setup.sql` (with real values filled in) to the repo.

## Google Calendar sync (optional)

Tasks with a due date can auto-create/update/delete a matching event on the user's
primary Google Calendar, via the `sync-google-calendar` Edge Function. The frontend
calls it directly (fire-and-forget) right after every task create/update/delete —
there's no schedule or cron involved for this one.

1. In [Google Cloud Console](https://console.cloud.google.com/apis/library), enable
   the **Google Calendar API** for the same project used for Sign In With Google.
2. Deploy the function:
   ```
   supabase functions deploy sync-google-calendar
   ```
3. Set its secrets — reuse the **same** OAuth Client ID/Secret from the Sign In With
   Google setup above (the one used in `Authentication → Providers → Google`):
   ```
   supabase secrets set GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
   supabase secrets set GOOGLE_CLIENT_SECRET=xxxxx
   ```
4. In the app, go to **Settings → Google Calendar → Connect**. This re-prompts
   Google consent asking for Calendar access (a separate, narrower scope from
   sign-in) and stores the refresh token it returns. Disconnecting deletes that
   stored token; already-created calendar events are left as-is.

The stored refresh token grants Calendar access to whichever Google account
connected — treat the `google_calendar_tokens` table as sensitive. Only the Edge
Function (via the service role key) and the owning user (via RLS) can read it.

## Schema

- `categories` — id, user_id, name, icon, color, created_at, updated_at
- `tasks` — id, user_id, title, description, status, priority, category_id (FK →
  categories, `on delete set null`), due_date, due_time, completed_at, recurrence
  (jsonb), reminder (jsonb), reminder_sent_at, google_event_id, notes, series_id,
  created_at, updated_at
- `settings` — one row per user, `id` = the user's `auth.users.id`: theme,
  default_priority, default_category_id, week_starts_on, date_format,
  time_format, notifications_enabled (browser), email_notifications_enabled
- `google_calendar_tokens` — one row per user who connected Calendar sync:
  user_id (PK), refresh_token, access_token, access_token_expires_at, calendar_id

`recurrence` and `reminder` are stored as `jsonb` — they match the shape of the
`Recurrence`/`Reminder` types in `frontend/src/features/tasks/schemas/task.schema.ts`
verbatim, so no separate tables/joins are needed for them.
