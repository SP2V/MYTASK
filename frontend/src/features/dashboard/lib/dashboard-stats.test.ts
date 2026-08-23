import { describe, expect, it } from 'vitest'
import { computeDashboardStats } from '@/features/dashboard/lib/dashboard-stats'
import type { Task } from '@/features/tasks/schemas/task.schema'

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? 'id',
    title: 'Untitled',
    description: null,
    status: 'TODO',
    priority: 'MEDIUM',
    categoryId: null,
    dueDate: null,
    dueTime: null,
    completedAt: null,
    recurrence: null,
    notes: null,
    seriesId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const TODAY = '2026-06-15'

describe('computeDashboardStats', () => {
  it('counts active, today, completed-today, overdue, and upcoming correctly', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', status: 'TODO', dueDate: TODAY }),
      makeTask({ id: '2', status: 'IN_PROGRESS', dueDate: '2026-06-20' }),
      makeTask({ id: '3', status: 'TODO', dueDate: '2026-06-10' }), // overdue
      makeTask({
        id: '4',
        status: 'COMPLETED',
        completedAt: '2026-06-15T10:00:00.000Z',
      }),
      makeTask({
        id: '5',
        status: 'COMPLETED',
        completedAt: '2026-06-01T10:00:00.000Z',
      }),
      makeTask({ id: '6', status: 'ARCHIVED' }),
    ]

    const now = new Date(2026, 5, 15, 12, 0, 0)
    const stats = computeDashboardStats(tasks, TODAY, now)

    expect(stats.totalActive).toBe(3) // 1, 2, 3
    expect(stats.todayCount).toBe(1) // task 1
    expect(stats.completedToday).toBe(1) // task 4
    expect(stats.overdueCount).toBe(1) // task 3
    expect(stats.upcomingCount).toBe(1) // task 2
  })

  it('computes completion percentage from active + completed tasks, excluding archived', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', status: 'TODO' }),
      makeTask({ id: '2', status: 'COMPLETED' }),
      makeTask({ id: '3', status: 'COMPLETED' }),
      makeTask({ id: '4', status: 'ARCHIVED' }),
    ]
    const stats = computeDashboardStats(tasks, TODAY)
    // 2 completed out of 3 considered (1 active + 2 completed) = 67%
    expect(stats.completionPercentage).toBe(67)
  })

  it('returns 0% completion with no tasks', () => {
    expect(computeDashboardStats([], TODAY).completionPercentage).toBe(0)
  })

  it('breaks down active tasks by category and priority', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', categoryId: 'work', priority: 'HIGH' }),
      makeTask({ id: '2', categoryId: 'work', priority: 'LOW' }),
      makeTask({ id: '3', categoryId: null, priority: 'HIGH' }),
      makeTask({ id: '4', categoryId: 'work', priority: 'HIGH', status: 'COMPLETED' }),
    ]
    const stats = computeDashboardStats(tasks, TODAY)

    expect(stats.byPriority.HIGH).toBe(2)
    expect(stats.byPriority.LOW).toBe(1)
    expect(stats.byPriority.URGENT).toBe(0)

    const workEntry = stats.byCategory.find((c) => c.categoryId === 'work')
    const uncategorizedEntry = stats.byCategory.find((c) => c.categoryId === null)
    expect(workEntry?.count).toBe(2)
    expect(uncategorizedEntry?.count).toBe(1)
  })
})
