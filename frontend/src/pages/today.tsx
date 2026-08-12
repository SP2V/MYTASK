import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { TaskViewSection } from '@/features/tasks/components/task-view-section'

export default function TodayPage() {
  return (
    <>
      <PageHeader title="Today" />
      <TaskViewSection
        view="TODAY"
        emptyState={
          <EmptyState icon="🎉" title="No tasks for today" description="Enjoy your free time!" />
        }
      />
    </>
  )
}
