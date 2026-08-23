import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMockSupabaseClient } from '@/test/supabase-mock'
import { renderWithProviders } from '@/test/render-with-providers'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/supabase-client', async () => {
  const { createMockSupabaseClient } = await import('@/test/supabase-mock')
  return { supabase: createMockSupabaseClient() }
})

const { supabase } = await import('@/lib/supabase-client')
const { default: SettingsPage } = await import('@/pages/settings')

describe('SettingsPage', () => {
  beforeEach(() => {
    ;(supabase as unknown as ReturnType<typeof createMockSupabaseClient>).__reset()
  })

  it('renders the main settings sections', () => {
    renderWithProviders(<SettingsPage />)
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByText('Appearance')).toBeInTheDocument()
    expect(screen.getByText('Task Defaults')).toBeInTheDocument()
    expect(screen.getByText('Data')).toBeInTheDocument()
  })

  it('requires confirmation before clearing all data', async () => {
    renderWithProviders(<SettingsPage />)

    await userEvent.click(screen.getByRole('button', { name: /clear all data/i }))

    expect(await screen.findByRole('heading', { name: /clear all data/i })).toBeInTheDocument()
  })
})
