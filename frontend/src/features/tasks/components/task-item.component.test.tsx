import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
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
