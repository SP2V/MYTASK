import type { Task, TaskPriority } from '@/features/tasks/schemas/task.schema'
import { compareDateOnly, isDueToday, isOverdue, isUpcoming, todayDateString } from '@/lib/date'
import { PRIORITY_META } from '@/lib/constants'

export type TaskView = 'TODAY' | 'UPCOMING' | 'OVERDUE' | 'COMPLETED' | 'NO_DUE_DATE' | 'ALL'

export function matchesView(
  task: Task,
  view: TaskView,
  today: string = todayDateString(),
  now: Date = new Date(),
): boolean {
  switch (view) {
    case 'TODAY':
      return task.status !== 'ARCHIVED' && isDueToday(task, today)
    case 'UPCOMING':
      return isUpcoming(task, today)
    case 'OVERDUE':
      return isOverdue(task, now)
    case 'COMPLETED':
      return task.status === 'COMPLETED'
    case 'NO_DUE_DATE':
      return task.status !== 'ARCHIVED' && task.status !== 'COMPLETED' && !task.dueDate
    case 'ALL':
      return task.status !== 'ARCHIVED'
  }
}

export function matchesSearch(task: Task, query: string): boolean {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return true
  return [task.title, task.description, task.notes].some((field) =>
    field?.toLowerCase().includes(trimmed),
  )
}

export interface TaskFilters {
  priorities?: TaskPriority[]
  categoryIds?: string[]
}

export function matchesFilters(task: Task, filters: TaskFilters): boolean {
  if (filters.priorities?.length && !filters.priorities.includes(task.priority)) return false
  if (filters.categoryIds?.length) {
    const categoryId = task.categoryId ?? 'uncategorized'
    if (!filters.categoryIds.includes(categoryId)) return false
  }
  return true
}

export type TaskSortField = 'dueDate' | 'priority' | 'createdAt' | 'updatedAt' | 'title'
export type SortDirection = 'asc' | 'desc'

export function sortTasks(
  tasks: Task[],
  field: TaskSortField,
  direction: SortDirection,
  priorityTieBreakNewestFirst = false,
): Task[] {
  const sorted = [...tasks].sort((a, b) => {
    let result = 0
    switch (field) {
      case 'dueDate':
        if (!a.dueDate && !b.dueDate) result = 0
        else if (!a.dueDate) result = 1
        else if (!b.dueDate) result = -1
        else result = compareDateOnly(a.dueDate, b.dueDate) || (a.dueTime ?? '').localeCompare(b.dueTime ?? '')
        break
      case 'priority':
        result = PRIORITY_META[a.priority].order - PRIORITY_META[b.priority].order
        break
      case 'createdAt':
        result = a.createdAt.localeCompare(b.createdAt)
        break
      case 'updatedAt':
        result = a.updatedAt.localeCompare(b.updatedAt)
        break
      case 'title':
        result = a.title.localeCompare(b.title)
        break
    }
    if (result === 0 && field === 'priority' && priorityTieBreakNewestFirst) {
      return b.createdAt.localeCompare(a.createdAt)
    }
    return direction === 'asc' ? result : -result
  })
  return sorted
}

export function queryTasks(
  tasks: Task[],
  options: {
    view: TaskView
    search?: string
    filters?: TaskFilters
    sortField?: TaskSortField
    sortDirection?: SortDirection
    priorityTieBreakNewestFirst?: boolean
    today?: string
  },
): Task[] {
  const {
    view,
    search = '',
    filters = {},
    sortField = 'dueDate',
    sortDirection = 'asc',
    priorityTieBreakNewestFirst = false,
    today,
  } = options
  const filtered = tasks
    .filter((t) => matchesView(t, view, today))
    .filter((t) => matchesSearch(t, search))
    .filter((t) => matchesFilters(t, filters))
  return sortTasks(filtered, sortField, sortDirection, priorityTieBreakNewestFirst)
}
