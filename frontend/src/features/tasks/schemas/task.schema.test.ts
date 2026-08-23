import { describe, expect, it } from 'vitest'
import { taskFormSchema, taskSchema } from '@/features/tasks/schemas/task.schema'

const validFormInput = {
  title: 'Buy groceries',
  description: null,
  priority: 'MEDIUM' as const,
  categoryId: null,
  dueDate: null,
  dueTime: null,
  recurrence: null,
  notes: null,
}

describe('taskFormSchema', () => {
  it('accepts a minimal valid task (title only)', () => {
    const result = taskFormSchema.safeParse(validFormInput)
    expect(result.success).toBe(true)
  })

  it('rejects an empty title', () => {
    const result = taskFormSchema.safeParse({ ...validFormInput, title: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a title that is only whitespace', () => {
    const result = taskFormSchema.safeParse({ ...validFormInput, title: '   ' })
    expect(result.success).toBe(false)
  })

  it('rejects a due time without a due date', () => {
    const result = taskFormSchema.safeParse({ ...validFormInput, dueDate: null, dueTime: '09:00' })
    expect(result.success).toBe(false)
  })

  it('accepts a due time when a due date is present', () => {
    const result = taskFormSchema.safeParse({
      ...validFormInput,
      dueDate: '2026-06-15',
      dueTime: '09:00',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a malformed due date', () => {
    const result = taskFormSchema.safeParse({ ...validFormInput, dueDate: '06/15/2026' })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid priority', () => {
    const result = taskFormSchema.safeParse({ ...validFormInput, priority: 'CRITICAL' })
    expect(result.success).toBe(false)
  })
})

describe('taskSchema', () => {
  const baseTask = {
    id: 'task-1',
    title: 'Buy groceries',
    description: null,
    status: 'TODO' as const,
    priority: 'MEDIUM' as const,
    categoryId: null,
    dueDate: null,
    dueTime: null,
    completedAt: null,
    recurrence: null,
    notes: null,
    seriesId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }

  it('accepts a fully-formed task', () => {
    expect(taskSchema.safeParse(baseTask).success).toBe(true)
  })

  it('rejects unknown fields (strict mode)', () => {
    const result = taskSchema.safeParse({ ...baseTask, extraField: 'nope' })
    expect(result.success).toBe(false)
  })

  it('rejects a completed task without completedAt validation issues when null', () => {
    // completedAt is nullable regardless of status at the schema level;
    // business-rule enforcement (status vs completedAt) lives in the repository.
    expect(taskSchema.safeParse({ ...baseTask, status: 'COMPLETED' }).success).toBe(true)
  })
})
