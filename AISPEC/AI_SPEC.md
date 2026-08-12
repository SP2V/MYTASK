# Personal Task Manager — AI Specification

## 1. Project Overview

Build a personal task management web application for a single user.

The application is intentionally designed for personal use rather than team collaboration. It should be fast, simple, responsive, visually clean, and easy to maintain.

Primary goals:
- Capture tasks quickly.
- Organize tasks by date, priority, status, and category.
- Track today's work and upcoming work.
- Support recurring tasks.
- Work offline-first.
- Avoid unnecessary authentication, team, permission, and collaboration features.
- Keep the architecture simple enough for one developer to maintain.

Project name: `Personal Task Manager`

## 2. Product Principles

1. Single-user first.
2. Local-first / offline-first.
3. Minimal clicks for common actions.
4. Clear visual hierarchy.
5. Mobile responsive.
6. Fast initial load.
7. No unnecessary enterprise features.
8. Data should remain under the user's control.
9. Destructive actions require confirmation when appropriate.
10. The UI should feel like a modern productivity application.

## 3. Target User

One individual who wants to manage:
- Work tasks
- Personal tasks
- Study tasks
- Projects
- Daily routines
- Recurring activities
- Short-term and long-term tasks

There are no team members, administrators, roles, invitations, or shared workspaces.

## 4. Core Features

### 4.1 Task CRUD
Users can:
- Create a task.
- Edit a task.
- Delete a task.
- Complete a task.
- Reopen a completed task.
- Duplicate a task.
- Archive a task.

Task fields:
- id
- title
- description
- status
- priority
- categoryId
- dueDate
- dueTime
- completedAt
- createdAt
- updatedAt
- recurringRule
- reminder
- notes

Title is required. All other fields are optional unless specified by business rules.

### 4.2 Status
Supported:
- TODO
- IN_PROGRESS
- COMPLETED
- ARCHIVED

Default: `TODO`.

### 4.3 Priority
Supported:
- LOW
- MEDIUM
- HIGH
- URGENT

Default: `MEDIUM`.

### 4.4 Categories
Users can create, edit, delete, and rename categories.

Default examples:
- Work
- Personal
- Study
- Other

Category fields:
- id
- name
- icon
- color
- createdAt
- updatedAt

Deleting a category must not delete its tasks. Tasks become uncategorized.

### 4.5 Due Dates
Tasks may have:
- No due date.
- Due date only.
- Due date + time.

Views:
- Today
- Upcoming
- Overdue
- No Due Date
- Calendar

### 4.6 Recurring Tasks
Supported:
- Daily
- Weekly
- Monthly
- Yearly
- Custom interval where practical

Completing a recurring task should create or schedule the next occurrence rather than permanently ending the series.

### 4.7 Search and Filters
Search:
- Task title
- Description
- Notes

Filters:
- Status
- Priority
- Category
- Due date
- Completion state

Sorting:
- Due date
- Priority
- Created date
- Updated date
- Title

### 4.8 Dashboard
Show:
- Total active tasks
- Today's tasks
- Completed today
- Overdue tasks
- Upcoming tasks
- Completion percentage

Optional:
- Completion donut/pie chart
- Tasks by category
- Tasks by priority

### 4.9 Calendar
Provide:
- Month view
- Week view where practical
- Day selection
- Tasks on due dates
- Click task to open details
- Create task from a date
- Drag/drop rescheduling if reliable

### 4.10 Reminders
Support:
- 15 minutes before
- 30 minutes before
- 1 hour before
- 1 day before

For offline-first use, use browser notification capabilities where supported and clearly communicate limitations.

### 4.11 Settings
Include:
- Theme: System / Light / Dark
- Default task priority
- Default category
- Start of week
- Date format
- Time format
- Notification preferences
- Data export
- Data import
- Clear all local data

Clear-all-data requires strong confirmation.

## 5. Offline-First Requirements

The application should function without an internet connection after initial installation/load.

Preferred storage:
- IndexedDB
- Dexie may be used as a wrapper.

Do not use localStorage as the primary database.

Persist:
- Tasks
- Categories
- Settings
- Recurrence data
- Reminder settings

Export format: JSON.

Import:
- Validate schema.
- Reject malformed files.
- Do not silently overwrite existing data.
- Provide an import summary.

## 6. UI Requirements

Main navigation:
- Inbox / All Tasks
- Today
- Upcoming
- Overdue
- Completed
- Calendar
- Categories
- Settings

Desktop:
- Left sidebar
- Main content
- Optional right-side task detail panel

Mobile:
- Bottom navigation or compact drawer
- Floating/add-task action
- Full-screen task editor where appropriate

Primary action: `+ Add Task`

Quick-add should be available from major task views.

## 7. Task Creation UX

Basic task creation should require only:
- Title
- Save

Advanced fields:
- Description
- Due date
- Due time
- Priority
- Category
- Recurrence
- Reminder
- Notes

Keyboard:
- Enter can submit quick-add.
- Escape can close dialogs.
- Focus should move logically.

## 8. Accessibility

Required:
- Semantic HTML
- Keyboard navigation
- Visible focus state
- Labels for form controls
- Accessible dialogs
- Sufficient text contrast
- Do not rely on color alone
- Screen-reader-friendly buttons and icons

## 9. Conceptual Data Model

### Task
```text
Task
- id: string
- title: string
- description: string | null
- status: enum
- priority: enum
- categoryId: string | null
- dueDate: string | null
- dueTime: string | null
- completedAt: string | null
- recurrence: Recurrence | null
- reminder: Reminder | null
- notes: string | null
- createdAt: string
- updatedAt: string
```

### Category
```text
Category
- id: string
- name: string
- icon: string | null
- color: string | null
- createdAt: string
- updatedAt: string
```

### Recurrence
```text
Recurrence
- frequency: DAILY | WEEKLY | MONTHLY | YEARLY | CUSTOM
- interval: number
- daysOfWeek: number[] | null
- dayOfMonth: number | null
- endDate: string | null
- enabled: boolean
```

### Reminder
```text
Reminder
- enabled: boolean
- offsetMinutes: number
```

### Settings
```text
Settings
- theme
- defaultPriority
- defaultCategoryId
- weekStartsOn
- dateFormat
- timeFormat
- notificationsEnabled
```

## 10. Business Rules

1. Task title cannot be empty.
2. Completing a task sets `completedAt`.
3. Reopening a task clears `completedAt`.
4. Completed tasks are excluded from active-task counts.
5. Archived tasks are excluded from normal active views.
6. A task without a due date must never be considered overdue.
7. A task is overdue when its due date/time is before the current time and it is not completed.
8. Recurring tasks must calculate their next occurrence consistently.
9. Deleting a category does not delete tasks.
10. Invalid imported data must never corrupt existing data.
11. Dates should be stored in a consistent machine-readable format.
12. UI date formatting follows user settings.

## 11. Performance

Target:
- Fast startup.
- No unnecessary API calls.
- Avoid rendering the entire task database when virtualization is justified.
- Debounce search.
- Lazy-load heavy calendar/chart components where useful.

## 12. Error Handling

Use user-friendly errors:
- `Unable to save task. Please try again.`
- `The imported file is invalid.`
- `Notification permission was not granted.`

Never expose stack traces to normal users.

## 13. Testing Requirements

Unit:
- Task validation
- Date calculations
- Overdue detection
- Recurrence calculation
- Filtering
- Sorting
- Import validation

Component:
- Task form
- Task item
- Filter controls
- Dashboard cards
- Calendar interactions

E2E:
- Create task
- Edit task
- Complete/reopen task
- Filter/search
- Create recurring task
- Export/import data
- Change settings

## 14. Non-Goals

Do NOT implement:
- Team collaboration
- User invitations
- Role-based access control
- Multi-tenant architecture
- Comments between users
- Team chat
- Shared workspaces
- Enterprise audit logs
- Organization management
- Complex permission systems

## 15. Definition of Done

- Core task CRUD works.
- Tasks persist after browser restart.
- Today/Upcoming/Overdue/Completed views work.
- Search and filters work.
- Recurring tasks work.
- Calendar works.
- Dashboard is accurate.
- Settings persist.
- Export/import works.
- Responsive layout works on desktop and mobile.
- Accessibility basics are implemented.
- No critical console errors remain.
- Core business logic tests pass.
