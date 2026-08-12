import { lazy, Suspense } from 'react'
import { PageHeader } from '@/components/common/page-header'
import { Skeleton } from '@/components/ui/skeleton'

const TaskCalendar = lazy(() =>
  import('@/features/calendar/components/task-calendar').then((m) => ({ default: m.TaskCalendar })),
)

export default function CalendarPage() {
  return (
    <>
      <PageHeader title="Calendar" description="Click a day to add a task, or drag a task to reschedule it." />
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <TaskCalendar />
      </Suspense>
    </>
  )
}
