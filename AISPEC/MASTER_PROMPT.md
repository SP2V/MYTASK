# Personal Task Manager — Master Prompt

You are a senior full-stack engineer and product-minded UI engineer.

Your job is to build a production-quality **Personal Task Manager** for a single user.

Source of truth:
- `AI_SPEC.md`
- `REQUIREMENTS.md`
- `MASTER_PROMPT.md`

Read all specification files before implementing anything.

## 1. Mission

Build a modern personal productivity application that allows one person to manage tasks quickly and reliably.

Priorities:
1. Simplicity
2. Speed
3. Offline-first behavior
4. Data persistence
5. Excellent UX
6. Responsive design
7. Maintainability

Do not turn this into an enterprise task platform.

## 2. Mandatory Architecture

Use:
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- IndexedDB
- Dexie or equivalent lightweight IndexedDB abstraction
- FullCalendar
- Recharts
- Vitest
- React Testing Library
- Playwright

Use additional libraries only when they solve a real requirement.

## 3. Scope Rule

This is a **single-user application**.

Do NOT implement:
- Authentication
- Registration
- Login
- Teams
- Organizations
- User roles
- Permissions
- Invitations
- Shared projects
- Comments between users
- Team chat
- Multi-tenancy
- Enterprise audit logs

Start directly at the task dashboard.

## 4. Source-of-Truth Rule

Before coding:
1. Read `AI_SPEC.md`.
2. Read `REQUIREMENTS.md`.
3. Identify functional requirements.
4. Identify business rules.
5. Identify data entities.
6. Identify screens.
7. Identify edge cases.
8. Create an implementation plan.

Do not invent conflicting requirements.

If a minor detail is unspecified, choose the simplest production-quality solution consistent with the architecture.

## 5. Development Strategy

### Phase 1 — Foundation
Set up:
- Vite
- React
- TypeScript
- Tailwind
- shadcn/ui
- ESLint
- Formatting
- Testing infrastructure

### Phase 2 — Storage
Implement IndexedDB storage for:
- Tasks
- Categories
- Settings

Keep database logic out of UI components.

### Phase 3 — Task Management
Implement:
- Create
- Read
- Update
- Delete
- Complete
- Reopen
- Archive
- Duplicate

Validate with Zod.

### Phase 4 — Organization
Implement:
- Categories
- Priority
- Status
- Search
- Filtering
- Sorting

### Phase 5 — Date Management
Implement:
- Today
- Upcoming
- Overdue
- No due date
- Calendar

Pay special attention to timezone and date-only values.

### Phase 6 — Recurring Tasks
Implement:
- Daily
- Weekly
- Monthly
- Yearly

Test:
- Month boundaries
- Leap years
- End-of-month recurrence
- Week boundaries

### Phase 7 — Dashboard
Implement:
- Statistics
- Completion percentage
- Today summary
- Overdue summary
- Upcoming summary
- Useful charts

### Phase 8 — Settings
Implement:
- Theme
- Default priority
- Default category
- Date/time format
- Week start
- Notification settings
- Import/export
- Clear data

### Phase 9 — Notifications
Implement browser notifications where supported.
Handle:
- Permission denied
- Unsupported browsers
- Notifications disabled

Do not pretend notifications work reliably in every offline/browser state.

### Phase 10 — Testing and Polish
Add:
- Unit tests
- Component tests
- E2E tests

Fix:
- Accessibility issues
- Responsive issues
- Empty states
- Loading states
- Error states
- Visual inconsistencies
- Keyboard navigation

## 6. UI/UX Direction

Design should feel like a modern productivity application.

Characteristics:
- Clean
- Minimal
- Professional
- Calm
- Spacious
- Strong typography
- Clear task hierarchy
- Subtle borders
- Consistent spacing
- Accessible controls

Avoid:
- Excessive gradients
- Excessive animations
- Cluttered dashboards
- Tiny text
- Too many colors
- Decorative UI that does not improve usability

## 7. Main Layout

Desktop:
```text
┌────────────────────────────────────────────────────┐
│ Header                              Search  Settings│
├───────────────┬────────────────────────────────────┤
│ Sidebar       │ Main Content                       │
│ Dashboard     │                                    │
│ Today         │                                    │
│ Upcoming      │                                    │
│ Overdue       │                                    │
│ Completed     │                                    │
│ Calendar      │                                    │
│ Categories    │                                    │
│ Settings      │                                    │
│               │                                    │
│ + Add Task    │                                    │
└───────────────┴────────────────────────────────────┘
```

Mobile:
- Compact header
- Main content
- Bottom navigation
- Floating/prominent Add Task action
- Full-screen dialogs where appropriate

## 8. Component Architecture

Prefer feature-based organization:

```text
src/
├── app/
├── components/
│   ├── ui/
│   ├── layout/
│   └── common/
├── features/
│   ├── tasks/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── schemas/
│   │   └── types/
│   ├── categories/
│   ├── calendar/
│   ├── dashboard/
│   ├── settings/
│   └── notifications/
├── db/
├── lib/
├── pages/
├── hooks/
├── types/
└── main.tsx
```

Avoid giant components.

## 9. State Management

Do not introduce a large global state library unless necessary.

Use:
- Local state for local UI.
- Context only for genuinely shared concerns.
- IndexedDB as persistent source of truth.
- TanStack Query only when its caching/data behavior provides clear value.

Do not duplicate task data in unrelated stores.

## 10. Validation

Use Zod for:
- Task
- Category
- Settings
- Recurrence
- Reminder
- Import/export

Never trust imported JSON.

## 11. Date and Time Rules

Be careful with:
- Date-only values
- Local timezone
- Due time
- Recurrence
- DST transitions
- Month-end dates
- Leap years

A task without a due date cannot be overdue.

Avoid accidental timezone shifts from date-only values.

## 12. Error Handling

All user-facing failures must produce useful feedback.

Use toast notifications or inline errors.

Examples:
- Save failed
- Delete failed
- Invalid import
- Notification unavailable

Do not expose technical stack traces.

## 13. Accessibility

Every interactive control must be accessible:
- Keyboard accessible
- Visible focus
- Proper labels
- Semantic buttons
- Accessible dialogs
- Accessible form errors
- Do not rely on color alone

## 14. Responsive Requirements

Test:
- 375px mobile
- 768px tablet
- 1024px desktop
- 1440px desktop

No horizontal scrolling in normal views.

## 15. Data Safety

Never silently destroy user data.

Before:
- Clear all data
- Destructive imports
- Destructive migrations

require confirmation or safe migration.

Export should create a complete backup.

## 16. Testing Strategy

Unit:
- Task validation
- Overdue calculation
- Recurrence calculation
- Filtering
- Sorting
- Dashboard calculations
- Import validation

Component:
- Task form
- Task item
- Task list
- Filters
- Dashboard cards
- Settings

E2E:
1. Open app.
2. Create task.
3. Edit task.
4. Complete task.
5. Reopen task.
6. Search task.
7. Filter task.
8. Create recurring task.
9. View calendar.
10. Export data.
11. Import data.
12. Change theme.

## 17. Code Quality Rules

Use strict TypeScript.

Avoid:
- `any`
- duplicated business logic
- giant components
- hardcoded repeated strings
- direct IndexedDB calls inside UI components
- unnecessary abstractions
- unnecessary dependencies

Prefer:
- Small functions
- Strong types
- Clear naming
- Reusable hooks
- Feature-based modules
- Explicit error handling

## 18. Git-Friendly Development

Make changes in logical units.

Recommended commits:
```text
feat: add task CRUD
feat: add recurring tasks
feat: add calendar view
feat: add dashboard
fix: correct overdue calculation
test: add recurrence tests
refactor: extract task repository
```

Do not commit secrets.

## 19. README

Create a useful `README.md` containing:
- Project overview
- Features
- Tech stack
- Installation
- Development commands
- Production build
- Testing
- Data storage explanation
- Export/import instructions
- Browser notification limitations

## 20. Final Verification

Run:
```bash
npm install
npm run lint
npm run test
npm run build
```

If Playwright is configured:
```bash
npm run test:e2e
```

Fix all critical errors.

Verify:
- No broken routes
- No critical console errors
- No data loss
- No layout overflow
- No broken mobile UI
- No inaccessible primary workflows

## 21. Final Deliverable

The final project must be a complete working Personal Task Manager.

It must not be a prototype with fake buttons.

Every visible primary action must either work or be intentionally marked unavailable.

The implementation must match `AI_SPEC.md` and `REQUIREMENTS.md`.

When requirements are ambiguous, prefer:

> simple + reliable + maintainable

over:

> complex + over-engineered + enterprise-like

## 22. Developer Instruction

Do not stop after creating the UI.

Implement the complete flow:

UI → validation → business logic → IndexedDB → persistence → feedback → tests.

The final result should be something a single person can actually use every day.
