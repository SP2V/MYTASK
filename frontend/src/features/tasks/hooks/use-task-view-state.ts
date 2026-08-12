import { useState } from 'react'
import type { TaskPriority } from '@/features/tasks/schemas/task.schema'
import type { SortDirection, TaskSortField } from '@/features/tasks/lib/task-query'

export function useTaskViewState(
  defaultSortField: TaskSortField = 'dueDate',
  defaultSortDirection: SortDirection = 'asc',
) {
  const [priorities, setPriorities] = useState<TaskPriority[]>([])
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [sortField, setSortField] = useState<TaskSortField>(defaultSortField)
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection)

  return {
    priorities,
    setPriorities,
    categoryIds,
    setCategoryIds,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
  }
}
