import type { ReactNode } from 'react'
import type { Task, TaskPriority } from '@/features/tasks/schemas/task.schema'
import { queryTasks, type TaskView } from '@/features/tasks/lib/task-query'
import { useTasks } from '@/features/tasks/hooks/use-tasks'
import { useSearch } from '@/features/tasks/hooks/search-context'
import { useTaskViewState } from '@/features/tasks/hooks/use-task-view-state'
import { FilterBar } from '@/features/tasks/components/filter-bar'
import { TaskList } from '@/features/tasks/components/task-list'
import type { TaskSortField } from '@/features/tasks/lib/task-query'

interface TaskViewSectionProps {
  view: TaskView
  emptyState: ReactNode
  defaultSortField?: TaskSortField
  defaultSortDirection?: 'asc' | 'desc'
  priorityTieBreakNewestFirst?: boolean
  showFilterBar?: boolean
  heading?: string
  sharedFilters?: {
    priorities: TaskPriority[]
    setPriorities: (priorities: TaskPriority[]) => void
    categoryIds: string[]
    setCategoryIds: (categoryIds: string[]) => void
  }
}

export function TaskViewSection({
  view,
  emptyState,
  defaultSortField = 'dueDate',
  defaultSortDirection = 'asc',
  priorityTieBreakNewestFirst = false,
  showFilterBar = true,
  heading,
  sharedFilters,
}: TaskViewSectionProps) {
  const allTasks = useTasks()
  const { debouncedQuery } = useSearch()
  const state = useTaskViewState(defaultSortField, defaultSortDirection)
  const filters = sharedFilters ?? state

  const tasks: Task[] | undefined = allTasks
    ? queryTasks(allTasks, {
        view,
        search: debouncedQuery,
        filters: { priorities: filters.priorities, categoryIds: filters.categoryIds },
        sortField: state.sortField,
        sortDirection: state.sortDirection,
        priorityTieBreakNewestFirst,
      })
    : undefined

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        {heading && <h2 className="text-sm font-semibold text-muted-foreground">{heading}</h2>}
        {showFilterBar && (
          <div className="ml-auto">
            <FilterBar
              priorities={filters.priorities}
              onPrioritiesChange={filters.setPriorities}
              categoryIds={filters.categoryIds}
              onCategoryIdsChange={filters.setCategoryIds}
              sortField={state.sortField}
              onSortFieldChange={state.setSortField}
              sortDirection={state.sortDirection}
              onSortDirectionChange={state.setSortDirection}
            />
          </div>
        )}
      </div>
      <TaskList tasks={tasks} emptyState={emptyState} />
    </div>
  )
}
