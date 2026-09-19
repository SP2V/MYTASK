import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Plus,
  LayoutDashboard,
  CalendarClock,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FolderKanban,
  StickyNote,
  ListChecks,
  Settings,
  Sparkles,
  CheckSquare2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTaskDialog } from '@/features/tasks/components/task-dialog-provider'
import { useTasks } from '@/features/tasks/hooks/use-tasks'
import { isOverdue, todayDateString } from '@/lib/date'

interface NavSection {
  title?: string
  items: {
    to: string
    label: string
    icon: typeof LayoutDashboard
    badgeKey?: 'today' | 'overdue'
  }[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Workspace',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/calendar', label: 'Calendar', icon: Calendar },
    ],
  },
  {
    title: 'Focus',
    items: [
      { to: '/today', label: 'Today', icon: CalendarClock, badgeKey: 'today' },
      { to: '/upcoming', label: 'Upcoming', icon: CalendarDays },
      { to: '/overdue', label: 'Overdue', icon: AlertTriangle, badgeKey: 'overdue' },
    ],
  },
  {
    title: 'Organize',
    items: [
      { to: '/projects', label: 'Projects', icon: ListChecks },
      { to: '/categories', label: 'Categories', icon: FolderKanban },
      { to: '/postit', label: 'Post-it Notes', icon: StickyNote },
      { to: '/completed', label: 'Completed', icon: CheckCircle2 },
    ],
  },
]

export function Sidebar() {
  const { openCreate } = useTaskDialog()
  const tasks = useTasks()

  const counts = useMemo(() => {
    if (!tasks) return { today: 0, overdue: 0 }
    const todayStr = todayDateString()
    let today = 0
    let overdue = 0
    for (const t of tasks) {
      if (t.status === 'ARCHIVED' || t.status === 'COMPLETED') continue
      if (t.dueDate === todayStr) today++
      if (isOverdue(t)) overdue++
    }
    return { today, overdue }
  }, [tasks])

  return (
    <aside className="hidden w-64 shrink-0 flex-col overflow-hidden border-r border-border/70 bg-card/60 backdrop-blur-2xl transition-all duration-300 md:flex">
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-tr from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-sm shadow-primary/20">
            <CheckSquare2 className="size-4.5" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-foreground">Task Manager</span>
            <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <Sparkles className="size-2.5 text-amber-500" /> Pro Workspace
            </span>
          </div>
        </div>
      </div>

      {/* Quick Add Button */}
      <div className="px-3.5 pt-4 pb-2">
        <Button
          className="group relative w-full justify-start gap-2.5 overflow-hidden rounded-xl bg-primary px-3.5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.99]"
          onClick={() => openCreate()}
        >
          <Plus className="size-4 transition-transform duration-200 group-hover:rotate-90" />
          <span>New Task</span>
          <kbd className="ml-auto pointer-events-none hidden rounded bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-primary-foreground/90 lg:inline-block">
            N
          </kbd>
        </Button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3.5 py-3" aria-label="Primary">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            {section.title && (
              <span className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.title}
              </span>
            )}
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-accent text-accent-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn(
                        'size-4 transition-colors',
                        isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground',
                      )}
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate">{item.label}</span>

                    {item.badgeKey === 'overdue' && counts.overdue > 0 && (
                      <span className="rounded-full bg-destructive/15 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-destructive">
                        {counts.overdue}
                      </span>
                    )}

                    {item.badgeKey === 'today' && counts.today > 0 && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-primary">
                        {counts.today}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom Footer: Settings link */}
      <div className="shrink-0 border-t border-border/60 p-3">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground font-semibold'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
            )
          }
        >
          <Settings className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="flex-1">Settings</span>
        </NavLink>
      </div>
    </aside>
  )
}
