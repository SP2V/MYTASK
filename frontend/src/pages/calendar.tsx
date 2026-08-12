import { lazy, Suspense } from 'react'
import { PageHeader } from '@/components/common/page-header'
import { Skeleton } from '@/components/ui/skeleton'

const TaskCalendar = lazy(() =>
  import('@/features/calendar/components/task-calendar').then((m) => ({ default: m.TaskCalendar })),
)

export default function CalendarPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader title="Calendar" description="Click a day to add a task, or drag a task to reschedule it." />
      <div className="min-h-0 flex-1">
        <Suspense fallback={<Skeleton className="h-full w-full" />}>
          <TaskCalendar />
        </Suspense>
      </div>
    </div>
  )
}
