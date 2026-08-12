import { lazy, Suspense, useMemo } from 'react'
import { ListTodo, CalendarClock, CheckCircle2, AlertTriangle, CalendarDays, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useTasks } from '@/features/tasks/hooks/use-tasks'
import { useCategories } from '@/features/categories/hooks/use-categories'
import { computeDashboardStats } from '@/features/dashboard/lib/dashboard-stats'
import { StatCard } from '@/features/dashboard/components/stat-card'

const DashboardCharts = lazy(() => import('@/features/dashboard/components/dashboard-charts'))

export default function DashboardPage() {
  const tasks = useTasks()
  const categories = useCategories()

  const stats = useMemo(() => computeDashboardStats(tasks ?? []), [tasks])

  return (
    <>
      <PageHeader title="Dashboard" description="Your task overview at a glance." />

      {tasks === undefined ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Active Tasks" value={stats.totalActive} icon={ListTodo} />
            <StatCard label="Today" value={stats.todayCount} icon={CalendarClock} />
            <StatCard label="Completed Today" value={stats.completedToday} icon={CheckCircle2} />
            <StatCard label="Overdue" value={stats.overdueCount} icon={AlertTriangle} tone="destructive" />
            <StatCard label="Upcoming" value={stats.upcomingCount} icon={CalendarDays} />
            <StatCard label="Completion" value={`${stats.completionPercentage}%`} icon={TrendingUp} />
          </div>

          <div className="mt-6">
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <DashboardCharts stats={stats} categories={categories ?? []} />
            </Suspense>
          </div>
        </>
      )}
    </>
  )
}
