import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { TaskViewSection } from '@/features/tasks/components/task-view-section'

export default function UpcomingPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Upcoming" />
      <TaskViewSection
        view="UPCOMING"
        emptyState={<EmptyState title="Nothing scheduled yet" />}
      />
      <TaskViewSection
        view="NO_DUE_DATE"
        heading="No Due Date"
        showFilterBar={false}
        defaultSortField="title"
        emptyState={<EmptyState title="No unscheduled tasks" />}
      />
    </div>
  )
}
