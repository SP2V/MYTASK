import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMockSupabaseClient } from '@/test/supabase-mock'
import { renderWithProviders } from '@/test/render-with-providers'

vi.mock('@/lib/supabase-client', async () => {
  const { createMockSupabaseClient } = await import('@/test/supabase-mock')
  return { supabase: createMockSupabaseClient() }
})

const { supabase } = await import('@/lib/supabase-client')
const { TaskForm } = await import('@/features/tasks/components/task-form')

describe('TaskForm', () => {
  beforeEach(() => {
    ;(supabase as unknown as ReturnType<typeof createMockSupabaseClient>).__reset()
  })

  it('submits with just a title (quick add)', async () => {
    const onSubmit = vi.fn()
    renderWithProviders(<TaskForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    await userEvent.type(screen.getByLabelText(/task title/i), 'Buy milk')
    await userEvent.click(screen.getByRole('button', { name: /save task/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Buy milk', priority: 'MEDIUM' }),
    )
  })

  it('shows a validation error and does not submit when title is empty', async () => {
    const onSubmit = vi.fn()
    renderWithProviders(<TaskForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /save task/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/title is required/i)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('disables due time until a due date is set', async () => {
    const onSubmit = vi.fn()
    renderWithProviders(<TaskForm onSubmit={onSubmit} onCancel={vi.fn()} defaultAdvancedOpen />)

    expect(screen.getByLabelText(/due time/i)).toBeDisabled()

    await userEvent.type(screen.getByLabelText(/due date/i), '2026-06-15')
    expect(screen.getByLabelText(/due time/i)).toBeEnabled()
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn()
    renderWithProviders(<TaskForm onSubmit={vi.fn()} onCancel={onCancel} />)

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
