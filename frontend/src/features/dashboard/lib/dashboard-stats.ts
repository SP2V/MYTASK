import type { Task, TaskPriority } from '@/features/tasks/schemas/task.schema'
import { TASK_PRIORITIES } from '@/features/tasks/schemas/task.schema'
import { matchesView } from '@/features/tasks/lib/task-query'
import { todayDateString } from '@/lib/date'

export interface CategoryBreakdownEntry {
  categoryId: string | null
  count: number
}

export interface DashboardStats {
  totalActive: number
  todayCount: number
  completedToday: number
  overdueCount: number
  upcomingCount: number
  completionPercentage: number
  byCategory: CategoryBreakdownEntry[]
  byPriority: Record<TaskPriority, number>
}

export function computeDashboardStats(
  tasks: Task[],
  today: string = todayDateString(),
  now: Date = new Date(),
): DashboardStats {
  const active = tasks.filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS')
  const completedAll = tasks.filter((t) => t.status === 'COMPLETED')

  const todayCount = active.filter((t) => t.dueDate === today).length
  const completedToday = completedAll.filter((t) => t.completedAt?.startsWith(today)).length
  const overdueCount = tasks.filter((t) => matchesView(t, 'OVERDUE', today, now)).length
  const upcomingCount = tasks.filter((t) => matchesView(t, 'UPCOMING', today, now)).length

  const totalConsidered = active.length + completedAll.length
  const completionPercentage =
    totalConsidered === 0 ? 0 : Math.round((completedAll.length / totalConsidered) * 100)

  const categoryMap = new Map<string | null, number>()
  for (const task of active) {
    categoryMap.set(task.categoryId, (categoryMap.get(task.categoryId) ?? 0) + 1)
  }
  const byCategory: CategoryBreakdownEntry[] = Array.from(categoryMap.entries()).map(
    ([categoryId, count]) => ({ categoryId, count }),
  )

  const byPriority = TASK_PRIORITIES.reduce(
    (acc, priority) => {
      acc[priority] = active.filter((t) => t.priority === priority).length
      return acc
    },
    {} as Record<TaskPriority, number>,
  )

  return {
    totalActive: active.length,
    todayCount,
    completedToday,
    overdueCount,
    upcomingCount,
    completionPercentage,
    byCategory,
    byPriority,
  }
}
