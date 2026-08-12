# Backend — Supabase

This app has no custom server. "Backend" here is just the Supabase Postgres schema
the frontend talks to directly via `@supabase/supabase-js`.

## ⚠️ Security tradeoff — read this first

This app has **no login**. The SQL migration enables Row Level Security but grants
the `anon` role full read/write access to every row (`using (true) with check (true)`).
That means **anyone who has your Supabase URL + anon key can read and modify your
tasks** — there is no per-user isolation.

This is an intentional choice for a personal, single-user tool, matching the original
"no login / no accounts" requirement. If you ever:

- deploy this somewhere public, or
- put the URL/key in a public repo or client-side bundle someone else can inspect,

...treat your task data as effectively public. If that's not acceptable, the fix is
to add Supabase Auth and scope the RLS policies to `auth.uid()` — that's a deliberate
scope change from what's built here, not a bug to report.

## Setup

1. Create a project at [supabase.com](https://supabase.com) (or run the Supabase CLI
   locally: `supabase init && supabase start`).
2. Open the SQL Editor in the Supabase dashboard and run, in order:
   - `supabase/migrations/0001_init.sql` — creates `tasks`, `categories`, `settings`
   - `supabase/seed.sql` — inserts the four default categories + settings row
   (Or, with the Supabase CLI: `supabase db push` then `supabase db execute -f supabase/seed.sql`.)
3. In the Supabase dashboard, go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key
4. In `frontend/`, copy `.env.example` to `.env` and fill in those two values:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. `cd frontend && npm run dev`

## Schema

- `categories` — id, name, icon, color, created_at, updated_at
- `tasks` — id, title, description, status, priority, category_id (FK →
  categories, `on delete set null`), due_date, due_time, completed_at, recurrence
  (jsonb), reminder (jsonb), notes, series_id, created_at, updated_at
- `settings` — single row keyed `id = 'app-settings'`: theme, default_priority,
  default_category_id, week_starts_on, date_format, time_format,
  notifications_enabled

`recurrence` and `reminder` are stored as `jsonb` — they match the shape of the
`Recurrence`/`Reminder` types in `frontend/src/features/tasks/schemas/task.schema.ts`
verbatim, so no separate tables/joins are needed for them.
