import { describe, expect, it } from 'vitest'
import type { Project } from '@/features/projects/schemas/project.schema'
import type { Task } from '@/features/tasks/schemas/task.schema'
import { summarizeProject, summarizeProjects } from './project-progress'

const timestamp = '2026-10-01T00:00:00.000Z'

function project(steps: [string, boolean][]): Project {
  return {
    id: 'p1',
    title: 'Launch',
    description: null,
    steps: steps.map(([title, isDone], order) => ({ id: `s${order}`, title, order, isDone })),
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    description: null,
    status: 'TODO',
    priority: 'MEDIUM',
    categoryId: null,
    projectId: 'p1',
    dueDate: null,
    dueTime: null,
    completedAt: null,
    recurrence: null,
    notes: null,
    seriesId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  }
}

const now = new Date('2026-10-24T12:00:00')

describe('summarizeProject', () => {
  it('counts steps and linked, non-archived tasks together', () => {
    const summary = summarizeProject(project([['Plan', true], ['Build', false]]), [
      task('done', { status: 'COMPLETED', completedAt: timestamp }),
      task('open'),
      task('archived', { status: 'ARCHIVED' }),
      task('other', { projectId: 'p2', status: 'COMPLETED' }),
      task('loose', { projectId: null }),
    ], now)
    expect(summary).toMatchObject({ stepsDone: 1, stepsTotal: 2, tasksDone: 1, tasksTotal: 2, done: 2, total: 4, percent: 50, status: 'IN_PROGRESS' })
    expect(summary.openTasks.map((t) => t.id)).toEqual(['open'])
    expect(summary.nextStep?.title).toBe('Build')
  })

  it('reports not started and completed states', () => {
    expect(summarizeProject(project([['Plan', false]]), [], now).status).toBe('NOT_STARTED')
    expect(summarizeProject(project([]), [], now)).toMatchObject({ status: 'NOT_STARTED', percent: 0 })
    expect(summarizeProject(project([['Plan', true]]), [task('t', { status: 'COMPLETED' })], now))
      .toMatchObject({ status: 'COMPLETED', percent: 100 })
  })

  it('orders open tasks by due date and counts overdue ones', () => {
    const summary = summarizeProject(project([['Plan', true]]), [
      task('undated'),
      task('later', { dueDate: '2026-11-01' }),
      task('late', { dueDate: '2026-10-20' }),
    ], now)
    expect(summary.openTasks.map((t) => t.id)).toEqual(['late', 'later', 'undated'])
    expect(summary.nextTask?.id).toBe('late')
    expect(summary.overdueCount).toBe(1)
  })
})

describe('summarizeProjects', () => {
  it('aggregates status counts and overall progress across items', () => {
    const a = summarizeProject(project([['Plan', true], ['Build', true]]), [], now)
    const b = summarizeProject(project([['Plan', false], ['Build', false]]), [], now)
    expect(summarizeProjects([a, b])).toEqual({ total: 2, inProgress: 0, notStarted: 1, completed: 1, overallPercent: 50 })
  })
})
