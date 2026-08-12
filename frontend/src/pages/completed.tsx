import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { TaskViewSection } from '@/features/tasks/components/task-view-section'

export default function CompletedPage() {
  return (
    <>
      <PageHeader title="Completed" />
      <TaskViewSection
        view="COMPLETED"
        defaultSortField="updatedAt"
        defaultSortDirection="desc"
        emptyState={<EmptyState title="No completed tasks yet" />}
      />
    </>
  )
}
