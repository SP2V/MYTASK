import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { TaskViewSection } from '@/features/tasks/components/task-view-section'

export default function ArchivedPage() {
  return (
    <>
      <PageHeader title="Archived" />
      <TaskViewSection
        view="ARCHIVED"
        defaultSortField="updatedAt"
        defaultSortDirection="desc"
        emptyState={<EmptyState title="No archived tasks" />}
      />
    </>
  )
}
