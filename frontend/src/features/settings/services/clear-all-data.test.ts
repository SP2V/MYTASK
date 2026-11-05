import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MockSupabaseClient } from '@/test/supabase-mock'

vi.mock('@/lib/supabase-client', async () => {
  const { createMockSupabaseClient } = await import('@/test/supabase-mock')
  return { supabase: createMockSupabaseClient() }
})

const { supabase } = await import('@/lib/supabase-client')
const { clearAllData } = await import('@/features/settings/services/clear-all-data')
const { taskRepository } = await import('@/features/tasks/services/task-repository')
const { categoryRepository } = await import('@/features/categories/services/category-repository')
const { projectRepository } = await import('@/features/projects/services/project-repository')
const { postitRepository } = await import('@/features/postits/services/postit-repository')

const mock = supabase as unknown as MockSupabaseClient

describe('clearAllData', () => {
  beforeEach(() => mock.__reset())

  it('wipes tasks, projects, steps, post-its and screenshots, then reseeds default categories', async () => {
    await categoryRepository.createCategory({ name: 'Custom', color: 'blue', icon: null })
    await projectRepository.createProject({ title: 'P', description: null, stepTitles: ['a', 'b'] })
    await postitRepository.createPostit({ content: 'note', color: 'yellow' })
    await taskRepository.createTask(
      {
        title: 'T',
        description: null,
        priority: 'MEDIUM',
        categoryId: null,
        dueDate: null,
        dueTime: null,
        recurrence: null,
        notes: null,
      },
      'data:image/png;base64,AAAA',
    )

    await clearAllData()

    expect(await taskRepository.getTasks()).toHaveLength(0)
    expect(await projectRepository.getProjects()).toHaveLength(0)
    expect(await postitRepository.getPostits()).toHaveLength(0)
    expect(mock.__store.get('project_steps') ?? []).toHaveLength(0)
    expect(mock.__store.get('task_description_images') ?? []).toHaveLength(0)
    expect((await categoryRepository.getCategories()).map((c) => c.name)).toEqual([
      'Work',
      'Personal',
      'Study',
      'Other',
    ])
  })

  it('removes the deleted tasks\' events from Google Calendar', async () => {
    const task = await taskRepository.createTask({
      title: 'Synced',
      description: null,
      priority: 'MEDIUM',
      categoryId: null,
      dueDate: '2026-12-01',
      dueTime: null,
      recurrence: null,
      notes: null,
    })
    mock.__store.get('tasks')!.find((r) => r.id === task.id)!.google_event_id = 'evt-1'
    mock.__invocations.length = 0

    await clearAllData()

    await vi.waitFor(() =>
      expect(mock.__invocations.map((i) => i.body)).toContainEqual(
        expect.objectContaining({ operation: 'delete_many', googleEventIds: ['evt-1'] }),
      ),
    )
  })
})
