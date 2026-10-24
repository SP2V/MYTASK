import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMockSupabaseClient } from '@/test/supabase-mock'
import { renderWithProviders } from '@/test/render-with-providers'
import type { TaskCreateInput } from '@/features/tasks/schemas/task.schema'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/supabase-client', async () => {
  const { createMockSupabaseClient } = await import('@/test/supabase-mock')
  return { supabase: createMockSupabaseClient() }
})

const { supabase } = await import('@/lib/supabase-client')
const { projectRepository } = await import('@/features/projects/services/project-repository')
const { taskRepository } = await import('@/features/tasks/services/task-repository')
const { TaskDialogProvider } = await import('@/features/tasks/components/task-dialog-provider')
const { default: ProjectsPage } = await import('@/pages/projects')

const baseTask: TaskCreateInput = {
  title: 'Task',
  description: null,
  priority: 'MEDIUM',
  categoryId: null,
  dueDate: null,
  dueTime: null,
  recurrence: null,
  notes: null,
}

function renderPage() {
  return renderWithProviders(
    <TaskDialogProvider>
      <ProjectsPage />
    </TaskDialogProvider>,
  )
}

describe('ProjectsPage', () => {
  beforeEach(() => {
    ;(supabase as unknown as ReturnType<typeof createMockSupabaseClient>).__reset()
  })

  it('shows progress from steps and linked tasks, with an overview', async () => {
    const launch = await projectRepository.createProject({ title: 'Launch', description: null, stepTitles: ['Plan', 'Build'] })
    await projectRepository.toggleStep(launch.id, launch.steps[0]!.id, true)
    const done = await taskRepository.createTask({ ...baseTask, title: 'Write copy', projectId: launch.id })
    await taskRepository.completeTask(done.id)
    await taskRepository.createTask({ ...baseTask, title: 'Ship it', projectId: launch.id })
    await projectRepository.createProject({ title: 'Garden', description: null, stepTitles: ['Dig'] })

    renderPage()

    const bar = await screen.findByRole('progressbar', { name: 'Launch progress' })
    expect(bar).toHaveAttribute('aria-valuenow', '50')
    expect(screen.getByText('1/2 steps')).toBeInTheDocument()
    expect(screen.getByText('1/2 tasks')).toBeInTheDocument()
    const overview = screen.getByRole('region', { name: 'Projects overview' })
    expect(within(overview).getByText('40%')).toBeInTheDocument()
  })

  it('expands a project to show its steps and linked tasks', async () => {
    const launch = await projectRepository.createProject({ title: 'Launch', description: null, stepTitles: ['Plan'] })
    await taskRepository.createTask({ ...baseTask, title: 'Ship it', projectId: launch.id })

    renderPage()

    expect(screen.queryByText('Ship it')).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: /launch/i, expanded: false }))
    expect(screen.getByRole('checkbox', { name: 'Mark step 1 as done' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Complete Ship it' }))
    expect(await screen.findByText('1/1 tasks')).toBeInTheDocument()
  })

  it('filters projects by status', async () => {
    const done = await projectRepository.createProject({ title: 'Finished', description: null, stepTitles: ['Only'] })
    await projectRepository.toggleStep(done.id, done.steps[0]!.id, true)
    await projectRepository.createProject({ title: 'Fresh', description: null, stepTitles: ['Start'] })

    renderPage()

    await userEvent.click(await screen.findByRole('tab', { name: /completed/i }))
    expect(screen.getByRole('progressbar', { name: 'Finished progress' })).toBeInTheDocument()
    expect(screen.queryByRole('progressbar', { name: 'Fresh progress' })).not.toBeInTheDocument()
  })
})
