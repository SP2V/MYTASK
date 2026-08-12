import { describe, expect, it } from 'vitest'
import { matchesSearch, matchesView, queryTasks, sortTasks } from '@/features/tasks/lib/task-query'
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
    reminder: null,
    notes: null,
    seriesId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const TODAY = '2026-06-15'

describe('matchesView', () => {
  it('TODAY matches only tasks due today, excluding archived', () => {
    expect(matchesView(makeTask({ dueDate: TODAY }), 'TODAY', TODAY)).toBe(true)
    expect(matchesView(makeTask({ dueDate: '2026-06-16' }), 'TODAY', TODAY)).toBe(false)
    expect(matchesView(makeTask({ dueDate: TODAY, status: 'ARCHIVED' }), 'TODAY', TODAY)).toBe(
      false,
    )
  })

  it('OVERDUE matches only incomplete tasks past due', () => {
    expect(matchesView(makeTask({ dueDate: '2026-06-14' }), 'OVERDUE', TODAY)).toBe(true)
    expect(
      matchesView(makeTask({ dueDate: '2026-06-14', status: 'COMPLETED' }), 'OVERDUE', TODAY),
    ).toBe(false)
  })

  it('COMPLETED matches only completed tasks regardless of due date', () => {
    expect(matchesView(makeTask({ status: 'COMPLETED' }), 'COMPLETED', TODAY)).toBe(true)
    expect(matchesView(makeTask({ status: 'TODO' }), 'COMPLETED', TODAY)).toBe(false)
  })

  it('NO_DUE_DATE matches only active tasks without a due date', () => {
    expect(matchesView(makeTask({ dueDate: null }), 'NO_DUE_DATE', TODAY)).toBe(true)
    expect(matchesView(makeTask({ dueDate: TODAY }), 'NO_DUE_DATE', TODAY)).toBe(false)
    expect(
      matchesView(makeTask({ dueDate: null, status: 'COMPLETED' }), 'NO_DUE_DATE', TODAY),
    ).toBe(false)
  })

  it('ALL excludes only archived tasks', () => {
    expect(matchesView(makeTask({ status: 'COMPLETED' }), 'ALL', TODAY)).toBe(true)
    expect(matchesView(makeTask({ status: 'ARCHIVED' }), 'ALL', TODAY)).toBe(false)
  })
})

describe('matchesSearch', () => {
  it('matches title, description, and notes case-insensitively', () => {
    const task = makeTask({ title: 'Buy Milk', description: 'From the store', notes: 'Organic' })
    expect(matchesSearch(task, 'milk')).toBe(true)
    expect(matchesSearch(task, 'STORE')).toBe(true)
    expect(matchesSearch(task, 'organic')).toBe(true)
    expect(matchesSearch(task, 'bread')).toBe(false)
  })

  it('treats an empty query as matching everything', () => {
    expect(matchesSearch(makeTask({}), '')).toBe(true)
    expect(matchesSearch(makeTask({}), '   ')).toBe(true)
  })
})

describe('sortTasks', () => {
  it('sorts by priority (urgent first) ascending', () => {
    const tasks = [
      makeTask({ id: 'a', priority: 'LOW' }),
      makeTask({ id: 'b', priority: 'URGENT' }),
      makeTask({ id: 'c', priority: 'MEDIUM' }),
    ]
    const sorted = sortTasks(tasks, 'priority', 'asc').map((t) => t.id)
    expect(sorted).toEqual(['b', 'c', 'a'])
  })

  it('sorts by dueDate ascending, pushing tasks with no due date last', () => {
    const tasks = [
      makeTask({ id: 'a', dueDate: null }),
      makeTask({ id: 'b', dueDate: '2026-06-20' }),
      makeTask({ id: 'c', dueDate: '2026-06-10' }),
    ]
    const sorted = sortTasks(tasks, 'dueDate', 'asc').map((t) => t.id)
    expect(sorted).toEqual(['c', 'b', 'a'])
  })

  it('sorts by title alphabetically', () => {
    const tasks = [makeTask({ id: 'a', title: 'Banana' }), makeTask({ id: 'b', title: 'Apple' })]
    const sorted = sortTasks(tasks, 'title', 'asc').map((t) => t.id)
    expect(sorted).toEqual(['b', 'a'])
  })

  it('reverses order when direction is desc', () => {
    const tasks = [makeTask({ id: 'a', title: 'Apple' }), makeTask({ id: 'b', title: 'Banana' })]
    const sorted = sortTasks(tasks, 'title', 'desc').map((t) => t.id)
    expect(sorted).toEqual(['b', 'a'])
  })
})

describe('queryTasks', () => {
  it('combines view, search, filters, and sort', () => {
    const tasks = [
      makeTask({ id: 'a', title: 'Write report', priority: 'HIGH', dueDate: TODAY }),
      makeTask({ id: 'b', title: 'Write email', priority: 'LOW', dueDate: TODAY }),
      makeTask({ id: 'c', title: 'Write memo', priority: 'HIGH', dueDate: '2026-06-20' }),
    ]
    const result = queryTasks(tasks, {
      view: 'TODAY',
      search: 'write',
      filters: { priorities: ['HIGH'] },
      sortField: 'title',
      sortDirection: 'asc',
      today: TODAY,
    })
    expect(result.map((t) => t.id)).toEqual(['a'])
  })
})
