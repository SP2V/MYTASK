import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabaseClient } from '@/test/supabase-mock'

vi.mock('@/lib/supabase-client', async () => {
  const { createMockSupabaseClient } = await import('@/test/supabase-mock')
  return { supabase: createMockSupabaseClient() }
})

const { supabase } = await import('@/lib/supabase-client')
const { importFromFile, buildExportData } = await import('@/features/settings/services/backup-service')
const { taskRepository } = await import('@/features/tasks/services/task-repository')
const { categoryRepository } = await import('@/features/categories/services/category-repository')

function jsonFile(content: unknown): File {
  return new File([JSON.stringify(content)], 'backup.json', { type: 'application/json' })
}

describe('importFromFile', () => {
  beforeEach(() => {
    ;(supabase as unknown as ReturnType<typeof createMockSupabaseClient>).__reset()
  })

  it('rejects a file that is not valid JSON', async () => {
    const file = new File(['not json {'], 'backup.json', { type: 'application/json' })
    const result = await importFromFile(file)
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('rejects a file missing required top-level fields', async () => {
    const result = await importFromFile(jsonFile({ tasks: [] }))
    expect(result.success).toBe(false)
  })

  it('rejects an unsupported version', async () => {
    const result = await importFromFile(
      jsonFile({
        version: 999,
        exportedAt: new Date().toISOString(),
        tasks: [],
        categories: [],
        settings: {},
      }),
    )
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/version/i)
  })

  it('rejects structurally invalid task/category data without touching existing data', async () => {
    await categoryRepository.createCategory({ name: 'Existing', color: 'blue', icon: null })

    const result = await importFromFile(
      jsonFile({
        version: 1,
        exportedAt: new Date().toISOString(),
        tasks: [{ title: 'missing required fields' }],
        categories: [],
        settings: {},
      }),
    )

    expect(result.success).toBe(false)
    const categories = await categoryRepository.getCategories()
    expect(categories).toHaveLength(1)
    expect(categories[0]?.name).toBe('Existing')
  })

  it('imports a valid, well-formed backup and reports an accurate summary', async () => {
    await taskRepository.createTask({
      title: 'Old task to be replaced',
      description: null,
      priority: 'MEDIUM',
      categoryId: null,
      dueDate: null,
      dueTime: null,
      recurrence: null,
      notes: null,
    })

    const exportData = await buildExportData()
    // Simulate a fresh backup with one task and one category
    const category = await categoryRepository.createCategory({
      name: 'Work',
      color: 'blue',
      icon: null,
    })
    const freshTasks = [
      ...exportData.tasks,
      {
        id: 'imported-task-1',
        title: 'Imported task',
        description: null,
        status: 'TODO' as const,
        priority: 'HIGH' as const,
        categoryId: category.id,
        dueDate: null,
        dueTime: null,
        completedAt: null,
        recurrence: null,
        notes: null,
        seriesId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks: freshTasks,
      categories: [category],
      settings: exportData.settings,
    }

    const result = await importFromFile(jsonFile(backup))

    expect(result.success).toBe(true)
    expect(result.summary?.tasksImported).toBe(freshTasks.length)
    expect(result.summary?.categoriesImported).toBe(1)

    const importedTasks = await taskRepository.getTasks()
    expect(importedTasks.some((t) => t.id === 'imported-task-1')).toBe(true)
  })
})
