import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { TaskViewSection } from '@/features/tasks/components/task-view-section'

export default function OverduePage() {
  return (
    <>
      <PageHeader title="Overdue" />
      <TaskViewSection
        view="OVERDUE"
        emptyState={<EmptyState icon="✅" title="You're all caught up!" />}
      />
    </>
  )
}
