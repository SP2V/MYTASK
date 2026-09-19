import { lazy, Suspense, useMemo } from 'react'
import {
  ListTodo,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  TrendingUp,
  Plus,
  Sparkles,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useTasks } from '@/features/tasks/hooks/use-tasks'
import { useCategories } from '@/features/categories/hooks/use-categories'
import { computeDashboardStats } from '@/features/dashboard/lib/dashboard-stats'
import { StatCard } from '@/features/dashboard/components/stat-card'
import { useTaskDialog } from '@/features/tasks/components/task-dialog-provider'

const DashboardCharts = lazy(() => import('@/features/dashboard/components/dashboard-charts'))

export default function DashboardPage() {
  const tasks = useTasks()
  const categories = useCategories()
  const { openCreate } = useTaskDialog()

  const stats = useMemo(() => computeDashboardStats(tasks ?? []), [tasks])

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Quick Action */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Dashboard</h1>
            <span className="hidden items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary sm:inline-flex">
              <Sparkles className="size-3" /> Today: {formattedDate}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Your productivity overview and task statistics.</p>
        </div>
        <Button
          onClick={() => openCreate()}
          className="w-full gap-2 rounded-xl shadow-sm sm:w-auto active:scale-95"
        >
          <Plus className="size-4" />
          Add Task
        </Button>
      </div>

      {tasks === undefined ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Progress Banner if there are tasks */}
          {stats.todayCount > 0 && (
            <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CalendarClock className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Today's Focus</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.completedToday} of {stats.todayCount + stats.completedToday} tasks completed today
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:w-64">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{
                      width: `${
                        stats.todayCount + stats.completedToday > 0
                          ? Math.round(
                              (stats.completedToday / (stats.todayCount + stats.completedToday)) * 100,
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {stats.todayCount + stats.completedToday > 0
                    ? `${Math.round((stats.completedToday / (stats.todayCount + stats.completedToday)) * 100)}%`
                    : '0%'}
                </span>
              </div>
            </div>
          )}

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Active Tasks" value={stats.totalActive} icon={ListTodo} />
            <StatCard label="Today" value={stats.todayCount} icon={CalendarClock} />
            <StatCard label="Completed Today" value={stats.completedToday} icon={CheckCircle2} />
            <StatCard label="Overdue" value={stats.overdueCount} icon={AlertTriangle} tone="destructive" />
            <StatCard label="Upcoming" value={stats.upcomingCount} icon={CalendarDays} />
            <StatCard label="Completion" value={`${stats.completionPercentage}%`} icon={TrendingUp} />
          </div>

          {/* Charts Section */}
          <div className="mt-2">
            <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
              <DashboardCharts stats={stats} categories={categories ?? []} />
            </Suspense>
          </div>
        </>
      )}
    </div>
  )
}
