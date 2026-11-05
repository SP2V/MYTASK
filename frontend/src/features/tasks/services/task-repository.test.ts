import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabaseClient, type MockSupabaseClient } from '@/test/supabase-mock'

vi.mock('@/lib/supabase-client', async () => {
  const { createMockSupabaseClient } = await import('@/test/supabase-mock')
  return { supabase: createMockSupabaseClient() }
})

const { supabase } = await import('@/lib/supabase-client')
const { taskRepository } = await import('@/features/tasks/services/task-repository')

/** Records every `from(table).<operation>()` call made while `fn` runs. */
async function recordOperations(mock: MockSupabaseClient, fn: () => Promise<unknown>): Promise<string[]> {
  const operations: string[] = []
  const originalFrom = mock.from
  mock.from = (table: string) => {
    const builder = originalFrom(table)
    return Object.fromEntries(
      Object.entries(builder).map(([operation, method]) => [
        operation,
        (...args: unknown[]) => {
          operations.push(`${table}.${operation}`)
          return (method as (...a: unknown[]) => unknown)(...args)
        },
      ]),
    ) as typeof builder
  }
  try {
    await fn()
  } finally {
    mock.from = originalFrom
  }
  return operations
}

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
  describe('duplicate completion', () => {
    const recurringInput = {
      title: 'Water plants',
      description: null,
      priority: 'MEDIUM' as const,
      categoryId: null,
      dueDate: '2026-06-15',
      dueTime: null,
      recurrence: {
        frequency: 'DAILY' as const,
        interval: 1,
        daysOfWeek: null,
        dayOfMonth: null,
        endDate: null,
        enabled: true,
      },
      notes: null,
    }

    it('completing the same recurring task twice concurrently creates one next occurrence', async () => {
      const task = await taskRepository.createTask(recurringInput)

      const results = await Promise.all([
        taskRepository.completeTask(task.id),
        taskRepository.completeTask(task.id),
      ])

      expect(results.filter((r) => r.nextOccurrence !== null)).toHaveLength(1)
      const tasks = await taskRepository.getTasks()
      expect(tasks).toHaveLength(2)
      expect(tasks.filter((t) => t.status === 'TODO').map((t) => t.dueDate)).toEqual(['2026-06-16'])
    })

    it('completing an already-completed task is a no-op', async () => {
      const task = await taskRepository.createTask(recurringInput)
      await taskRepository.completeTask(task.id)

      const again = await taskRepository.completeTask(task.id)

      expect(again.nextOccurrence).toBeNull()
      expect(again.completed.status).toBe('COMPLETED')
      expect(await taskRepository.getTasks()).toHaveLength(2)
    })

    it('carries the screenshot over to the next occurrence', async () => {
      const task = await taskRepository.createTask(recurringInput, 'data:image/png;base64,AAAA')

      const { nextOccurrence } = await taskRepository.completeTask(task.id)

      expect(nextOccurrence?.hasDescriptionImage).toBe(true)
      expect(await taskRepository.getDescriptionImage(nextOccurrence!.id)).toBe('data:image/png;base64,AAAA')
    })
  })

  describe('description screenshots', () => {
    const mock = supabase as unknown as MockSupabaseClient
    const input = {
      title: 'With screenshot',
      description: null,
      priority: 'MEDIUM' as const,
      categoryId: null,
      dueDate: null,
      dueTime: null,
      recurrence: null,
      notes: null,
    }

    it('updating without passing an image keeps it and does not re-upload it', async () => {
      const task = await taskRepository.createTask(input, 'data:image/png;base64,AAAA')
      let updated!: Awaited<ReturnType<typeof taskRepository.updateTask>>
      const operations = await recordOperations(mock, async () => {
        updated = await taskRepository.updateTask(task.id, { title: 'Renamed' })
      })

      expect(operations).not.toContain('task_description_images.upsert')
      expect(operations).not.toContain('task_description_images.delete')
      expect(updated.title).toBe('Renamed')
      expect(updated.hasDescriptionImage).toBe(true)
      expect(await taskRepository.getDescriptionImage(task.id)).toBe('data:image/png;base64,AAAA')
    })

    it('passing null removes the image and a string replaces it', async () => {
      const task = await taskRepository.createTask(input, 'data:image/png;base64,AAAA')

      await taskRepository.updateTask(task.id, {}, 'data:image/png;base64,BBBB')
      expect(await taskRepository.getDescriptionImage(task.id)).toBe('data:image/png;base64,BBBB')

      const cleared = await taskRepository.updateTask(task.id, {}, null)
      expect(cleared.hasDescriptionImage).toBe(false)
      expect(await taskRepository.getDescriptionImage(task.id)).toBeNull()
    })

    it('status changes report the image without downloading it', async () => {
      const task = await taskRepository.createTask(input, 'data:image/png;base64,AAAA')

      const archived = await taskRepository.archiveTask(task.id)

      expect(archived.hasDescriptionImage).toBe(true)
      expect(archived.descriptionImage).toBeUndefined()
    })
  })

  it('setTasksProject moves several tasks in a single request', async () => {
    const mock = supabase as unknown as MockSupabaseClient
    const base = {
      description: null,
      priority: 'MEDIUM' as const,
      categoryId: null,
      dueDate: null,
      dueTime: null,
      recurrence: null,
      notes: null,
    }
    const a = await taskRepository.createTask({ ...base, title: 'A' })
    const b = await taskRepository.createTask({ ...base, title: 'B' })
    const c = await taskRepository.createTask({ ...base, title: 'C' })
    const operations = await recordOperations(mock, () =>
      taskRepository.setTasksProject([a.id, b.id], 'project-1'),
    )

    expect(operations).toEqual(['tasks.update'])
    const byId = new Map((await taskRepository.getTasks()).map((t) => [t.id, t]))
    expect(byId.get(a.id)?.projectId).toBe('project-1')
    expect(byId.get(b.id)?.projectId).toBe('project-1')
    expect(byId.get(c.id)?.projectId).toBeNull()
  })
})
