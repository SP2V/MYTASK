# Personal Task Manager

A fast task manager for a single user, signed in with Google. Add tasks, organize
by category/priority/due date, recurring tasks, calendar view, dashboard, and full
export/import — built to be used every day, not a demo.

## Structure

```text
MYTASK/
├── AISPEC/     — original spec docs (source of truth for requirements)
├── frontend/   — React + TypeScript app (Vite, Tailwind, TanStack Query)
└── backend/    — Supabase schema (SQL migrations + seed); no custom server
```

There is no backend server process — `frontend/` talks to Supabase directly.

## Quick Start

1. Set up Supabase — follow **[backend/README.md](backend/README.md)** first
   (create project, run the SQL migrations, enable Google as a sign-in
   provider, get your API credentials).
2. Set up the app — follow **[frontend/README.md](frontend/README.md)**
   (`.env`, `npm install`, `npm run dev`), then sign in with Google.

## Features

- Task CRUD: create, edit, delete, complete, reopen, duplicate, archive
- Priority (Low/Medium/High/Urgent) and user-defined categories with color
- Due dates + optional time; recurring tasks (Daily/Weekly/Monthly/Yearly/Custom)
  with correct month-end/leap-year handling
- Today, Upcoming, Overdue, Completed, Calendar, Categories, Dashboard views
- Debounced search, filter by priority/category, sort by date/priority/title
- Calendar with click-to-add and drag-to-reschedule (FullCalendar)
- Dashboard stats + category/priority breakdown charts (Recharts)
- Google sign-in (Supabase Auth); every user's data is private, scoped by RLS
- Optional Google Calendar sync — tasks with a due date auto-create/update/
  delete a matching event on the user's primary calendar
- Theme (system/light/dark), configurable defaults, date/time format
- Versioned JSON export/import, validated before touching any data
- Clear All Data with confirmation

Full feature list, tech stack, and data storage details: **[frontend/README.md](frontend/README.md)**.
Database schema and setup: **[backend/README.md](backend/README.md)**.

## Tech Stack

React 18 + TypeScript (strict) · Vite 6 · Tailwind CSS v4 · Radix UI primitives ·
React Hook Form + Zod · TanStack Query · Supabase · FullCalendar · Recharts ·
Vitest + React Testing Library · Playwright

## Testing

```bash
cd frontend
npm run lint       # ESLint
npm run test       # Vitest — unit + component tests (Supabase mocked, no project needed)
npm run test:e2e   # Playwright — full flow, needs a real Supabase project in .env
```
"# MYTASK" 
