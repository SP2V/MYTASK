import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMockSupabaseClient } from '@/test/supabase-mock'
import { renderWithProviders } from '@/test/render-with-providers'
import type { Task } from '@/features/tasks/schemas/task.schema'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/supabase-client', async () => {
  const { createMockSupabaseClient } = await import('@/test/supabase-mock')
  return { supabase: createMockSupabaseClient() }
})

const { supabase } = await import('@/lib/supabase-client')
const { taskRepository } = await import('@/features/tasks/services/task-repository')
const { TaskItem } = await import('@/features/tasks/components/task-item')
const { TaskDialogProvider } = await import('@/features/tasks/components/task-dialog-provider')

function renderTaskItem(task: Task) {
  return renderWithProviders(
    <TaskDialogProvider>
      <TaskItem task={task} />
    </TaskDialogProvider>,
  )
}

describe('TaskItem', () => {
  beforeEach(() => {
    ;(supabase as unknown as ReturnType<typeof createMockSupabaseClient>).__reset()
  })

  it('renders the task title and priority', async () => {
    const task = await taskRepository.createTask({
      title: 'Ship the release',
      description: null,
      priority: 'URGENT',
      categoryId: null,
      dueDate: null,
      dueTime: null,
      recurrence: null,
      notes: null,
    })

    renderTaskItem(task)

    expect(screen.getByText('Ship the release')).toBeInTheDocument()
    expect(screen.getByText('Urgent')).toBeInTheDocument()
  })

  it('marks a task complete when the checkbox is clicked', async () => {
    const task = await taskRepository.createTask({
      title: 'Finish the report',
      description: null,
      priority: 'MEDIUM',
      categoryId: null,
      dueDate: null,
      dueTime: null,
      recurrence: null,
      notes: null,
    })

    renderTaskItem(task)

    const checkbox = screen.getByRole('checkbox', { name: /complete finish the report/i })
    await userEvent.click(checkbox)

    const updated = await taskRepository.getTaskById(task.id)
    expect(updated?.status).toBe('COMPLETED')
    expect(updated?.completedAt).not.toBeNull()
  })

  it('ignores a second click while completing is still in flight', async () => {
    const task = await taskRepository.createTask({
      title: 'Daily review',
      description: null,
      priority: 'MEDIUM',
      categoryId: null,
      dueDate: '2026-06-15',
      dueTime: null,
      recurrence: { frequency: 'DAILY', interval: 1, daysOfWeek: null, dayOfMonth: null, endDate: null, enabled: true },
      notes: null,
    })
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    const original = taskRepository.completeTask.bind(taskRepository)
    const completeSpy = vi.spyOn(taskRepository, 'completeTask').mockImplementation(async (id) => {
      await gate
      return original(id)
    })

    renderTaskItem(task)
    const checkbox = screen.getByRole('checkbox', { name: /complete daily review/i })
    fireEvent.click(checkbox)
    fireEvent.click(checkbox)
    expect(checkbox).toBeDisabled()
    release()

    await waitFor(() => expect(checkbox).not.toBeDisabled())
    expect(completeSpy).toHaveBeenCalledTimes(1)
    expect((await taskRepository.getTasks()).filter((t) => t.status === 'TODO')).toHaveLength(1)
    completeSpy.mockRestore()
  })

  it('shows a due-date badge styled as overdue when the task is past due', async () => {
    const task = await taskRepository.createTask({
      title: 'Late task',
      description: null,
      priority: 'MEDIUM',
      categoryId: null,
      dueDate: '2020-01-01',
      dueTime: null,
      recurrence: null,
      notes: null,
    })

    renderTaskItem(task)
    expect(screen.getByText('Late task')).toBeInTheDocument()
    expect(screen.getByText('Jan 1')).toBeInTheDocument()
  })
})
