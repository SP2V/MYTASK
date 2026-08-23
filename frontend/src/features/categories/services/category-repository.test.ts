import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabaseClient } from '@/test/supabase-mock'

vi.mock('@/lib/supabase-client', async () => {
  const { createMockSupabaseClient } = await import('@/test/supabase-mock')
  return { supabase: createMockSupabaseClient() }
})

const { supabase } = await import('@/lib/supabase-client')
const { categoryRepository } = await import('@/features/categories/services/category-repository')
const { taskRepository } = await import('@/features/tasks/services/task-repository')

describe('categoryRepository', () => {
  beforeEach(() => {
    ;(supabase as unknown as ReturnType<typeof createMockSupabaseClient>).__reset()
  })

  it('creates and updates a category', async () => {
    const category = await categoryRepository.createCategory({
      name: 'Work',
      color: 'blue',
      icon: null,
    })
    expect(category.name).toBe('Work')

    const updated = await categoryRepository.updateCategory(category.id, { name: 'Career' })
    expect(updated.name).toBe('Career')
  })

  it('deleting a category does not delete its tasks — they become uncategorized', async () => {
    const category = await categoryRepository.createCategory({
      name: 'Work',
      color: 'blue',
      icon: null,
    })
    const task = await taskRepository.createTask({
      title: 'Quarterly report',
      description: null,
      priority: 'MEDIUM',
      categoryId: category.id,
      dueDate: null,
      dueTime: null,
      recurrence: null,
      notes: null,
    })

    await categoryRepository.deleteCategory(category.id)

    const categories = await categoryRepository.getCategories()
    expect(categories).toHaveLength(0)

    const persistedTask = await taskRepository.getTaskById(task.id)
    expect(persistedTask).toBeDefined()
    expect(persistedTask?.categoryId).toBeNull()
  })
})
