# Backend — Supabase

This app has no custom server for its data layer. "Backend" here is the
Supabase Postgres schema the frontend talks to directly via
`@supabase/supabase-js`, plus an Edge Function for Google Calendar sync.

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
   - `supabase/migrations/0003_email_reminders.sql` — historical, superseded by
     `0005_remove_reminders.sql` below
   - `supabase/migrations/0004_calendar_sync.sql` — adds Google Calendar token
     storage and the `tasks.google_event_id` link column
   - `supabase/migrations/0005_remove_reminders.sql` — drops the browser/email
     reminder columns, trigger, and cron job (the feature was removed)
   - `supabase/migrations/0006_postits.sql` — creates `postits` for the
     Post-it board (kept separate from `tasks`)
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
  (jsonb), google_event_id, notes, series_id, created_at, updated_at
- `settings` — one row per user, `id` = the user's `auth.users.id`: theme,
  default_priority, default_category_id, week_starts_on, date_format, time_format
- `google_calendar_tokens` — one row per user who connected Calendar sync:
  user_id (PK), refresh_token, access_token, access_token_expires_at, calendar_id
- `postits` — id, user_id, content, color, created_at, updated_at (Post-it
  board notes; independent of `tasks`)

`recurrence` is stored as `jsonb` — it matches the shape of the `Recurrence`
type in `frontend/src/features/tasks/schemas/task.schema.ts` verbatim, so no
separate table/join is needed for it.
