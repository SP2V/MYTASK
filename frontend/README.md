# Personal Task Manager

A fast task manager for a single user. No login, no accounts, no team features.
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
- **Reminders** — optional browser notifications 15m/30m/1h/1d before a task is due
  (see [Notification limitations](#notification-limitations))
- **Settings** — theme (system/light/dark), default priority/category, week start,
  date/time format, notifications
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
SQL migration, and getting your API credentials. **Read the security note there** —
this app has no login, so anyone with your Supabase URL/key can read and write your data.

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

Because there's no login, data is not tied to "your" browser — it's tied to whichever
Supabase project your `.env` points at. Anyone with that project's URL and anon key can
read and write it.

## Export / Import

Settings → **Export Data** downloads a timestamped JSON backup:

```json
{
  "version": 1,
  "exportedAt": "2026-08-12T00:00:00.000Z",
  "tasks": [],
  "categories": [],
  "settings": {}
}
```

Settings → **Import Data** validates the file (JSON shape, version, and every task/
category/setting via Zod) before touching the database. An invalid file is rejected
with an error and your existing data is left untouched. A successful import replaces
categories then tasks then settings (in that order, to satisfy the tasks→categories
foreign key) and shows a summary of what was imported. This is not wrapped in a single
database transaction (no server-side function in this no-backend setup) — see the
comment in `src/features/settings/services/backup-service.ts` for the tradeoff.

**Clear All Data** (Settings) permanently wipes everything in Supabase and reseeds the
default categories; it requires an explicit confirmation dialog.

## Notification Limitations

Reminders use the browser [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notification).
This has real limits, and the app does not pretend otherwise:

- Requires the user to explicitly grant permission; if denied or dismissed, no
  notification will fire and the Settings page reflects that.
- Not supported in every browser/environment — the app detects this and disables
  the toggle accordingly.
- Reminders are checked **only while the app tab is open** (a 30-second in-memory
  poll). There is no service worker or background scheduling, so a reminder will not
  fire while the browser is closed or the tab isn't loaded.
- Reminder "already notified" state is tracked in memory only, so reloading the app
  within a reminder's trigger window may re-show it once.

If reliable background notifications matter for your workflow, treat in-app reminders
as a convenience layer on top of checking Today/Overdue yourself, not a guarantee.

## Project Structure

```text
src/
├── app/            # Router + top-level providers (QueryClientProvider, etc.)
├── components/
│   ├── ui/         # Base primitives (button, dialog, select, ...)
│   ├── layout/      # Sidebar, header, mobile nav, app shell
│   └── common/      # Empty states, confirm dialog, page header
├── features/
│   ├── tasks/        # Task CRUD, forms, filtering/sorting, recurrence engine
│   ├── categories/   # Category CRUD
│   ├── calendar/      # FullCalendar integration
│   ├── dashboard/     # Stats + charts
│   ├── settings/      # Theme, preferences, export/import, backup service, clear-all-data
│   └── notifications/ # Browser Notification wrapper + reminder scheduler
├── lib/             # Supabase client, date utilities, id generation, shared constants
├── pages/           # Route-level page components
├── hooks/           # Cross-feature hooks (debounce, media query)
└── test/            # Test-only helpers: Supabase mock, renderWithProviders
```

Database access is confined to the `services/` (repository) layer in each feature —
UI components never call the Supabase client directly. Each repository maps between
the app's camelCase types and Supabase's snake_case columns (`*-mapper.ts` files).
