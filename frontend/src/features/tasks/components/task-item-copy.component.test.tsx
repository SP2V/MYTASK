import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMockSupabaseClient } from '@/test/supabase-mock'
import { renderWithProviders } from '@/test/render-with-providers'
import type { TaskCreateInput } from '@/features/tasks/schemas/task.schema'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/tasks/lib/copy-description', () => ({ copyDescription: vi.fn() }))
vi.mock('@/lib/supabase-client', async () => {
  const { createMockSupabaseClient } = await import('@/test/supabase-mock')
  return { supabase: createMockSupabaseClient() }
})

const { supabase } = await import('@/lib/supabase-client')
const { toast } = await import('sonner')
const { copyDescription } = await import('@/features/tasks/lib/copy-description')
const { taskRepository } = await import('@/features/tasks/services/task-repository')
const { TaskItem } = await import('@/features/tasks/components/task-item')
const { TaskDialogProvider } = await import('@/features/tasks/components/task-dialog-provider')

const baseInput: TaskCreateInput = {
  title: 'Write handoff',
  description: null,
  priority: 'MEDIUM',
  categoryId: null,
  dueDate: null,
  dueTime: null,
  recurrence: null,
  notes: null,
}

async function renderListedTask(input: Partial<TaskCreateInput>, screenshot: string | null = null) {
  await taskRepository.createTask({ ...baseInput, ...input }, screenshot)
  const [task] = await taskRepository.getTasks()
  renderWithProviders(
    <TaskDialogProvider>
      <TaskItem task={task!} />
    </TaskDialogProvider>,
  )
}

describe('TaskItem description copy', () => {
  beforeEach(() => {
    ;(supabase as unknown as ReturnType<typeof createMockSupabaseClient>).__reset()
    vi.clearAllMocks()
    vi.mocked(copyDescription).mockResolvedValue(undefined)
  })

  it('hides the copy button when there is no description or screenshot', async () => {
    await renderListedTask({ description: null })
    expect(screen.queryByRole('button', { name: /copy description/i })).not.toBeInTheDocument()
  })

  it('copies description text from the list', async () => {
    await renderListedTask({ description: 'Detail line' })
    await userEvent.click(screen.getByRole('button', { name: /copy description of write handoff/i }))
    expect(copyDescription).toHaveBeenCalledWith('Detail line', null)
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Description copied'))
  })

  it('loads the saved screenshot on click and copies it with the text', async () => {
    const screenshot = 'data:image/webp;base64,aQ=='
    await renderListedTask({ description: 'With image' }, screenshot)
    await userEvent.click(screen.getByRole('button', { name: /copy description of write handoff/i }))
    const [text, image] = vi.mocked(copyDescription).mock.calls[0]!
    expect(text).toBe('With image')
    await expect(Promise.resolve(image)).resolves.toBe(screenshot)
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Description and screenshot copied'))
  })

  it('reports clipboard failures', async () => {
    vi.mocked(copyDescription).mockRejectedValue(new Error('denied'))
    await renderListedTask({ description: 'Detail' })
    await userEvent.click(screen.getByRole('button', { name: /copy description of write handoff/i }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })
})
