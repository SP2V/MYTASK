import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabaseClient } from '@/test/supabase-mock'

vi.mock('@/lib/supabase-client', async () => {
  const { createMockSupabaseClient } = await import('@/test/supabase-mock')
  return { supabase: createMockSupabaseClient() }
})

const { supabase } = await import('@/lib/supabase-client')
const { taskRepository } = await import('@/features/tasks/services/task-repository')

describe('taskRepository', () => {
  beforeEach(() => {
    ;(supabase as unknown as ReturnType<typeof createMockSupabaseClient>).__reset()
  })

  it('creates a task with defaults applied', async () => {
    const task = await taskRepository.createTask({
      title: 'Write tests',
      description: null,
      priority: 'HIGH',
      categoryId: null,
      dueDate: null,
      dueTime: null,
      recurrence: null,
      notes: null,
    })

    expect(task.status).toBe('TODO')
    expect(task.completedAt).toBeNull()
    expect(task.id).toBeTruthy()
  })

  it('rejects an empty title', async () => {
    await expect(
      taskRepository.createTask({
        title: '',
        description: null,
        priority: 'MEDIUM',
        categoryId: null,
        dueDate: null,
        dueTime: null,
        recurrence: null,
          notes: null,
      }),
    ).rejects.toThrow()
  })

  it('completing a task sets completedAt and reopening clears it', async () => {
    const task = await taskRepository.createTask({
      title: 'One-off task',
      description: null,
      priority: 'MEDIUM',
      categoryId: null,
      dueDate: null,
      dueTime: null,
      recurrence: null,
      notes: null,
    })

    const { completed, nextOccurrence } = await taskRepository.completeTask(task.id)
    expect(completed.status).toBe('COMPLETED')
    expect(completed.completedAt).not.toBeNull()
    expect(nextOccurrence).toBeNull()

    const reopened = await taskRepository.reopenTask(task.id)
    expect(reopened.status).toBe('TODO')
    expect(reopened.completedAt).toBeNull()
  })

  it('completing a recurring task schedules the next occurrence', async () => {
    const task = await taskRepository.createTask({
      title: 'Daily standup',
      description: null,
      priority: 'MEDIUM',
      categoryId: null,
      dueDate: '2026-06-15',
      dueTime: null,
      recurrence: {
        frequency: 'DAILY',
        interval: 1,
        daysOfWeek: null,
        dayOfMonth: null,
        endDate: null,
        enabled: true,
      },
      notes: null,
    })

    const { completed, nextOccurrence } = await taskRepository.completeTask(task.id)
    expect(completed.status).toBe('COMPLETED')
    expect(nextOccurrence).not.toBeNull()
    expect(nextOccurrence?.dueDate).toBe('2026-06-16')
    expect(nextOccurrence?.status).toBe('TODO')
    expect(nextOccurrence?.seriesId).toBe(task.id)

    const allTasks = await taskRepository.getTasks()
    expect(allTasks).toHaveLength(2)
  })

  it('duplicating a task resets status and completion', async () => {
    const task = await taskRepository.createTask({
      title: 'Original',
      description: null,
      priority: 'MEDIUM',
      categoryId: null,
      dueDate: null,
      dueTime: null,
      recurrence: null,
      notes: null,
    })
    await taskRepository.completeTask(task.id)

    const duplicate = await taskRepository.duplicateTask(task.id)
    expect(duplicate.id).not.toBe(task.id)
    expect(duplicate.title).toContain('Original')
    expect(duplicate.status).toBe('TODO')
    expect(duplicate.completedAt).toBeNull()
  })

  it('deleting a task removes it', async () => {
    const task = await taskRepository.createTask({
      title: 'To delete',
      description: null,
      priority: 'MEDIUM',
      categoryId: null,
      dueDate: null,
      dueTime: null,
      recurrence: null,
      notes: null,
    })
    await taskRepository.deleteTask(task.id)
    expect(await taskRepository.getTaskById(task.id)).toBeUndefined()
  })
})
