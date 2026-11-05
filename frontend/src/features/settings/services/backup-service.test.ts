import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabaseClient, type MockSupabaseClient } from '@/test/supabase-mock'

vi.mock('@/lib/supabase-client', async () => {
  const { createMockSupabaseClient } = await import('@/test/supabase-mock')
  return { supabase: createMockSupabaseClient() }
})

const { supabase } = await import('@/lib/supabase-client')
const { importFromFile, buildExportData } = await import('@/features/settings/services/backup-service')
const { taskRepository } = await import('@/features/tasks/services/task-repository')
const { categoryRepository } = await import('@/features/categories/services/category-repository')
const { projectRepository } = await import('@/features/projects/services/project-repository')
const { postitRepository } = await import('@/features/postits/services/postit-repository')

const mock = supabase as unknown as MockSupabaseClient

const baseTaskInput = {
  description: null,
  priority: 'MEDIUM' as const,
  categoryId: null,
  dueDate: null,
  dueTime: null,
  recurrence: null,
  notes: null,
}

function setGoogleEventId(taskId: string, googleEventId: string) {
  const row = mock.__store.get('tasks')!.find((r) => r.id === taskId)!
  row.google_event_id = googleEventId
}

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

describe('buildExportData', () => {
  beforeEach(() => mock.__reset())

  it('writes a v2 backup that includes projects (with steps) and post-its', async () => {
    await projectRepository.createProject({ title: 'Launch', description: null, stepTitles: ['Plan', 'Ship'] })
    await postitRepository.createPostit({ content: 'Remember milk', color: 'yellow' })

    const data = await buildExportData()

    expect(data.version).toBe(2)
    expect(data.projects).toHaveLength(1)
    expect(data.projects[0]?.steps.map((s) => s.title)).toEqual(['Plan', 'Ship'])
    expect(data.postits.map((p) => p.content)).toEqual(['Remember milk'])
  })
})

describe('importFromFile (v2 and safety)', () => {
  beforeEach(() => mock.__reset())

  it('round-trips projects, steps, post-its and project links on a fresh account', async () => {
    const project = await projectRepository.createProject({
      title: 'Launch',
      description: 'Big one',
      stepTitles: ['Plan', 'Ship'],
    })
    await postitRepository.createPostit({ content: 'Remember milk', color: 'pink' })
    const task = await taskRepository.createTask({ ...baseTaskInput, title: 'Linked', projectId: project.id })
    const backup = await buildExportData()

    // Simulate restoring on a brand-new account: nothing exists yet.
    mock.__reset()
    const result = await importFromFile(jsonFile(backup))

    expect(result.success).toBe(true)
    expect(result.summary).toMatchObject({ projectsImported: 1, postitsImported: 1, danglingReferencesCleared: 0 })
    const projects = await projectRepository.getProjects()
    expect(projects).toHaveLength(1)
    expect(projects[0]?.steps.map((s) => s.title)).toEqual(['Plan', 'Ship'])
    expect((await postitRepository.getPostits()).map((p) => p.content)).toEqual(['Remember milk'])
    expect((await taskRepository.getTaskById(task.id))?.projectId).toBe(project.id)
  })

  it('v2 import replaces existing projects and post-its', async () => {
    const backup = await buildExportData() // empty v2 backup
    await projectRepository.createProject({ title: 'Old project', description: null, stepTitles: ['x'] })
    await postitRepository.createPostit({ content: 'Old note', color: 'yellow' })

    const result = await importFromFile(jsonFile(backup))

    expect(result.success).toBe(true)
    expect(await projectRepository.getProjects()).toHaveLength(0)
    expect(await postitRepository.getPostits()).toHaveLength(0)
    expect(mock.__store.get('project_steps') ?? []).toHaveLength(0)
  })

  it('v1 import keeps existing projects/post-its and clears links to projects that do not exist', async () => {
    const kept = await projectRepository.createProject({ title: 'Kept', description: null, stepTitles: ['a'] })
    await postitRepository.createPostit({ content: 'Kept note', color: 'yellow' })
    const now = new Date().toISOString()
    const v1Task = (id: string, projectId: string | null, categoryId: string | null) => ({
      id,
      title: id,
      description: null,
      status: 'TODO' as const,
      priority: 'LOW' as const,
      categoryId,
      projectId,
      dueDate: null,
      dueTime: null,
      completedAt: null,
      recurrence: null,
      notes: null,
      seriesId: null,
      createdAt: now,
      updatedAt: now,
    })

    const result = await importFromFile(
      jsonFile({
        version: 1,
        exportedAt: now,
        tasks: [
          v1Task('links-kept-project', kept.id, null),
          v1Task('links-missing-project', 'missing-project', null),
          v1Task('links-missing-category', null, 'missing-category'),
        ],
        categories: [],
        settings: { defaultCategoryId: 'missing-category' },
      }),
    )

    expect(result.success).toBe(true)
    expect(result.summary).toMatchObject({ projectsImported: null, postitsImported: null, danglingReferencesCleared: 3 })
    expect(await projectRepository.getProjects()).toHaveLength(1)
    expect(await postitRepository.getPostits()).toHaveLength(1)
    const tasks = await taskRepository.getTasks()
    const byId = new Map(tasks.map((t) => [t.id, t]))
    expect(byId.get('links-kept-project')?.projectId).toBe(kept.id)
    expect(byId.get('links-missing-project')?.projectId).toBeNull()
    expect(byId.get('links-missing-category')?.categoryId).toBeNull()
  })

  it('restores the previous data exactly when a write fails part-way', async () => {
    const category = await categoryRepository.createCategory({ name: 'Mine', color: 'blue', icon: null })
    const original = await taskRepository.createTask({ ...baseTaskInput, title: 'Keep me', categoryId: category.id })
    setGoogleEventId(original.id, 'evt-original')
    await projectRepository.createProject({ title: 'Keep project', description: null, stepTitles: ['s'] })

    const backup = await buildExportData()
    backup.tasks = [{ ...backup.tasks[0]!, id: 'other-task', title: 'From backup' }]
    backup.projects = []

    mock.__invocations.length = 0
    mock.__failNext('tasks', 'insert', 'network blip')
    const result = await importFromFile(jsonFile(backup))

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/network blip/)
    expect(result.error).toMatch(/restored/)
    const tasks = await taskRepository.getTasks()
    expect(tasks.map((t) => t.title)).toEqual(['Keep me'])
    expect(tasks[0]?.categoryId).toBe(category.id)
    // Raw columns the app schema doesn't model survive the rollback too.
    expect(mock.__store.get('tasks')![0]!.google_event_id).toBe('evt-original')
    expect((await projectRepository.getProjects()).map((p) => p.title)).toEqual(['Keep project'])
    // No calendar side effects for a failed import.
    expect(mock.__invocations).toHaveLength(0)
  })

  it('removes replaced tasks\' Google events and syncs imported active tasks with due dates', async () => {
    const old = await taskRepository.createTask({ ...baseTaskInput, title: 'Old' })
    setGoogleEventId(old.id, 'evt-old')
    const backup = await buildExportData()
    const now = new Date().toISOString()
    const make = (id: string, status: 'TODO' | 'COMPLETED', dueDate: string | null) => ({
      ...backup.tasks[0]!,
      id,
      title: id,
      status,
      dueDate,
      completedAt: status === 'COMPLETED' ? now : null,
    })
    backup.tasks = [make('due-todo', 'TODO', '2026-12-01'), make('due-done', 'COMPLETED', '2026-12-01'), make('no-date', 'TODO', null)]
    mock.__invocations.length = 0

    const result = await importFromFile(jsonFile(backup))
    expect(result.success).toBe(true)

    await vi.waitFor(() => {
      const bodies = mock.__invocations.map((i) => i.body as Record<string, unknown>)
      expect(bodies).toContainEqual(expect.objectContaining({ operation: 'delete_many', googleEventIds: ['evt-old'] }))
      expect(bodies).toContainEqual(expect.objectContaining({ operation: 'upsert_many', taskIds: ['due-todo'] }))
    })
  })

  it('rejects a backup with duplicate IDs without touching data', async () => {
    await taskRepository.createTask({ ...baseTaskInput, title: 'Existing' })
    const backup = await buildExportData()
    backup.tasks = [backup.tasks[0]!, backup.tasks[0]!]

    const result = await importFromFile(jsonFile(backup))

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/duplicate/i)
    expect(await taskRepository.getTasks()).toHaveLength(1)
  })
})
