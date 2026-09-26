import { useState } from 'react'
import { EmptyState } from '@/components/common/empty-state'
import { TaskViewSection } from '@/features/tasks/components/task-view-section'
import type { TaskPriority } from '@/features/tasks/schemas/task.schema'

export default function UpcomingPage() {
  const [priorities, setPriorities] = useState<TaskPriority[]>([])
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const sharedFilters = { priorities, setPriorities, categoryIds, setCategoryIds }

  return (
    <div className="flex flex-col gap-8">
      <TaskViewSection
        view="UPCOMING"
        defaultSortField="priority"
        defaultSortDirection="asc"
        priorityTieBreakNewestFirst
        sharedFilters={sharedFilters}
        emptyState={<EmptyState title="Nothing scheduled yet" />}
      />
      <TaskViewSection
        view="NO_DUE_DATE"
        heading="No Due Date"
        showFilterBar={false}
        defaultSortField="priority"
        defaultSortDirection="asc"
        priorityTieBreakNewestFirst
        sharedFilters={sharedFilters}
        emptyState={<EmptyState title="No unscheduled tasks" />}
      />
    </div>
  )
}
