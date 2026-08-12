# Personal Task Manager — Requirements

## 1. Purpose

Create a simple, modern, single-user task management application.

The system is for one person and prioritizes speed, simplicity, privacy, and offline use.

## 2. Functional Requirements

### FR-001 — Create Task
The user shall be able to create a task.

Required:
- Title

Optional:
- Description
- Due date
- Due time
- Priority
- Category
- Recurrence
- Reminder
- Notes

Acceptance:
- Empty title cannot be saved.
- Successful creation immediately displays the task.
- Task remains after refresh.

### FR-002 — Edit Task
The user shall be able to edit task properties.

### FR-003 — Delete Task
The user shall be able to delete a task.
A confirmation should be shown for destructive deletion when appropriate.

### FR-004 — Complete Task
The user shall be able to mark a task completed.
The system records completion time.

### FR-005 — Reopen Task
The user shall be able to reopen a completed task.

### FR-006 — Priority
Support:
- Low
- Medium
- High
- Urgent

### FR-007 — Category
The user shall be able to assign a task to a category.

### FR-008 — Due Date
The user shall be able to set an optional due date.

### FR-009 — Due Time
The user shall optionally set a time when a due date exists.

### FR-010 — Recurring Tasks
Support:
- Daily
- Weekly
- Monthly
- Yearly

### FR-011 — Search
The user shall be able to search tasks.

### FR-012 — Filtering
Filter by:
- Status
- Priority
- Category
- Date
- Completion state

### FR-013 — Sorting
Sort by:
- Due date
- Priority
- Created date
- Updated date
- Title

### FR-014 — Today
Show tasks due today.

### FR-015 — Upcoming
Show future tasks.

### FR-016 — Overdue
Show incomplete overdue tasks.

### FR-017 — Completed
Show completed tasks.

### FR-018 — Calendar
Show tasks on a calendar.

### FR-019 — Dashboard
Display:
- Active tasks
- Today
- Completed today
- Overdue
- Upcoming

### FR-020 — Settings
Configure:
- Theme
- Default priority
- Default category
- Week start
- Date format
- Time format
- Notifications

### FR-021 — Export
Export application data as JSON.

### FR-022 — Import
Import valid JSON data.

### FR-023 — Clear Data
Delete all local data after confirmation.

## 3. Non-Functional Requirements

### NFR-001 — Responsive
Work on desktop, tablet, and mobile.

### NFR-002 — Offline
Core task management works without internet.

### NFR-003 — Persistence
Data persists after page refresh and browser restart.

### NFR-004 — Accessibility
Support keyboard navigation and accessible labels.

### NFR-005 — Performance
Common actions should feel immediate.

### NFR-006 — Reliability
Failed operations must not silently destroy existing data.

### NFR-007 — Privacy
Default architecture sends no task data to external servers.

## 4. Recommended Technology

Frontend:
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- TanStack Query where useful
- FullCalendar
- Recharts
- i18next if multilingual support is implemented

Storage:
- IndexedDB
- Dexie recommended.

Testing:
- Vitest
- React Testing Library
- Playwright

## 5. Main Screens

1. Dashboard
2. Today
3. Upcoming
4. Overdue
5. Completed
6. Calendar
7. Categories
8. Settings

## 6. Navigation

Desktop:
```text
Dashboard
Today
Upcoming
Overdue
Completed
Calendar
Categories
Settings
```

Mobile:
```text
Home
Today
Calendar
Tasks
More
```

Prominent `+ Add Task` action should be available.

## 7. Task List Requirements

Each task item should display where applicable:
- Completion checkbox
- Task title
- Priority indicator
- Category
- Due date
- Due time
- Recurrence indicator

Actions:
- Complete
- Edit
- Delete
- More

## 8. Task Form Requirements

```text
Task title
[________________________]

Description
[________________________]

Due date
[__________]

Due time
[__________]

Priority
[Medium ▼]

Category
[Work ▼]

Recurrence
[None ▼]

Reminder
[None ▼]

Notes
[________________________]

[Cancel] [Save Task]
```

Support both create and edit modes.

## 9. Empty States

Today:
> No tasks for today. Enjoy your free time!

Upcoming:
> Nothing scheduled yet.

Completed:
> No completed tasks yet.

Overdue:
> You're all caught up!

## 10. Confirmation Requirements

Confirm:
- Delete task
- Delete category when it affects references
- Clear all data
- Import that would overwrite or merge existing data

No confirmation needed for:
- Completing a task
- Reopening a task
- Saving normal edits

## 11. Data Export Format

```json
{
  "version": 1,
  "exportedAt": "2026-08-10T00:00:00.000Z",
  "tasks": [],
  "categories": [],
  "settings": {}
}
```

Schema must be versioned for future migrations.

## 12. Definition of Done

- Builds successfully.
- No critical runtime errors.
- Persists tasks locally.
- Supports core CRUD.
- Supports search/filter/sort.
- Supports date views.
- Supports recurring tasks.
- Supports calendar.
- Supports dashboard.
- Supports settings.
- Supports import/export.
- Works responsively.
- Passes core tests.
