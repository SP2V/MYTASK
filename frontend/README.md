# Personal Task Manager

A fast task manager for a single user, signed in with Google via Supabase Auth.
Data lives in Supabase — see [`../backend/README.md`](../backend/README.md) for setup.

## Features

- **Task CRUD** — create, edit, delete, complete, reopen, duplicate, and archive tasks
- **Priority & category** — Low/Medium/High/Urgent priority, user-defined categories with color
- **Due dates & times** — optional date and time, never overdue without a due date
- **Recurring tasks** — Daily/Weekly/Monthly/Yearly/Custom, correctly handles month-end
  clamping, leap years, and year rollovers; completing an occurrence schedules the next one
- **Views** — Dashboard, Today, Upcoming (+ No Due Date), Overdue, Completed, Calendar, Categories
- **Search, filter, sort** — debounced full-text search across title/description/notes,
  filter by priority/category, sort by due date/priority/created/updated/title
- **Calendar** — month/week views (FullCalendar), click a day to add a task, drag to reschedule
- **Dashboard** — active/today/completed-today/overdue/upcoming counts, completion %,
  breakdown by category and priority (Recharts)
- **Google sign-in** — Supabase Auth (Google OAuth); every user's tasks, categories,
  and settings are private, scoped by row-level security
- **Google Calendar sync** — optional, per-user opt-in (Settings → Google Calendar →
  Connect); tasks with a due date are created/updated/deleted as events on the
  user's primary calendar automatically after every save
- **Settings** — theme (system/light/dark), default priority/category, week start,
  date/time format, Google Calendar connection
- **Export / Import** — versioned JSON backup, validated on import, never corrupts
  existing data on a bad file

## Tech Stack

- React 18 + TypeScript (strict) + Vite 6
- Tailwind CSS v4 + hand-authored shadcn-style UI primitives (Radix + CVA)
- React Router, React Hook Form + Zod
- Supabase (`@supabase/supabase-js`) + TanStack Query for reactive data fetching
- FullCalendar, Recharts (both lazy-loaded)
- Vitest + React Testing Library, Playwright

## Setup

This app needs a Supabase project before it will run — see
[`../backend/README.md`](../backend/README.md) for creating the project, running the
SQL migrations, enabling Google as a sign-in provider, and getting your API credentials.

```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

## Build

```bash
npm run build      # type-check + production build
npm run preview     # serve the production build locally
```

## Testing

```bash
npm run lint         # ESLint
npm run test         # Vitest — unit + component tests (Supabase client is mocked, no project needed)
npm run test:watch   # Vitest in watch mode
npm run test:e2e     # Playwright — full golden-path flow; needs a real Supabase project (.env filled in)
```

## Data Storage

All data (tasks, categories, settings) lives in Supabase Postgres — see
[`../backend/README.md`](../backend/README.md) for the schema. This app makes no
requests to any server other than your Supabase project; `localStorage`/IndexedDB are
not used for task data.

Data is tied to your Google account, not your browser — sign in from any device and
you'll see the same tasks. Row-level security scopes every query to `auth.uid()`, so
the anon key alone grants no access to anyone's data.

## Export / Import

Settings → **Export Data** downloads a timestamped JSON backup of tasks (with
screenshots), categories, projects (with steps), post-its and settings:

```json
{
  "version": 2,
  "exportedAt": "2026-08-12T00:00:00.000Z",
  "tasks": [],
  "categories": [],
  "projects": [],
  "postits": [],
  "settings": {}
}
```

Settings → **Import Data** validates the file (JSON shape, version, every record via
Zod, no duplicate IDs) before touching the database; an invalid file is rejected and
your data is left untouched. Links the backup can't satisfy (a task pointing at a
category or project that isn't in it) are cleared rather than failing the import.
Older **version 1** backups (no projects/post-its) are still accepted and keep your
existing projects and post-its.

Supabase offers this client-only app no multi-table transaction, so the import first
snapshots your current data and, if any write fails part-way, puts that snapshot back —
you end up with either the backup or exactly what you had. After a successful import,
the replaced tasks' Google Calendar events are removed and events are created for the
imported tasks. See `src/features/settings/services/backup-service.ts`.

**Clear All Data** (Settings) permanently wipes every task, category, project, post-it
and screenshot, reseeds the default categories and settings, and removes the deleted
tasks' events from Google Calendar (the calendar connection itself is kept); it requires
an explicit confirmation dialog.

## Project Structure

```text
src/
├── app/            # Router + top-level providers (QueryClientProvider, etc.)
├── components/
│   ├── ui/         # Base primitives (button, dialog, select, ...)
│   ├── layout/      # Sidebar, header, mobile nav, app shell
│   ├── auth/        # RequireAuth route guard
│   └── common/      # Empty states, confirm dialog, page header
├── features/
│   ├── auth/         # Google sign-in, session state (AuthProvider/useAuth)
│   ├── tasks/        # Task CRUD, forms, filtering/sorting, recurrence engine
│   ├── categories/   # Category CRUD
│   ├── calendar/      # FullCalendar integration
│   ├── dashboard/     # Stats + charts
│   └── settings/      # Theme, preferences, export/import, backup service, clear-all-data
├── lib/             # Supabase client, date utilities, id generation, shared constants
├── pages/           # Route-level page components
├── hooks/           # Cross-feature hooks (debounce, media query)
└── test/            # Test-only helpers: Supabase mock, renderWithProviders
```

Database access is confined to the `services/` (repository) layer in each feature —
UI components never call the Supabase client directly. Each repository maps between
the app's camelCase types and Supabase's snake_case columns (`*-mapper.ts` files).
