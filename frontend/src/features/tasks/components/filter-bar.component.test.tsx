import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMockSupabaseClient } from '@/test/supabase-mock'
import { renderWithProviders } from '@/test/render-with-providers'

vi.mock('@/lib/supabase-client', async () => {
  const { createMockSupabaseClient } = await import('@/test/supabase-mock')
  return { supabase: createMockSupabaseClient() }
})

const { supabase } = await import('@/lib/supabase-client')
const { FilterBar } = await import('@/features/tasks/components/filter-bar')

function renderFilterBar(overrides: Partial<ComponentProps<typeof FilterBar>> = {}) {
  const props: ComponentProps<typeof FilterBar> = {
    priorities: [],
    onPrioritiesChange: vi.fn(),
    categoryIds: [],
    onCategoryIdsChange: vi.fn(),
    sortField: 'dueDate',
    onSortFieldChange: vi.fn(),
    sortDirection: 'asc',
    onSortDirectionChange: vi.fn(),
    ...overrides,
  }
  return { ...renderWithProviders(<FilterBar {...props} />), props }
}

describe('FilterBar', () => {
  beforeEach(() => {
    ;(supabase as unknown as ReturnType<typeof createMockSupabaseClient>).__reset()
  })

  it('opens the filter popover and toggles a priority checkbox', async () => {
    const { props } = renderFilterBar()

    await userEvent.click(screen.getByRole('button', { name: /filter/i }))
    await userEvent.click(await screen.findByText('Urgent'))

    expect(props.onPrioritiesChange).toHaveBeenCalledWith(['URGENT'])
  })

  it('shows an active filter count badge when filters are applied', () => {
    renderFilterBar({ priorities: ['HIGH', 'URGENT'] })
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('toggles sort direction when the sort-direction button is clicked', async () => {
    const { props } = renderFilterBar()
    await userEvent.click(screen.getByRole('button', { name: /sort ascending/i }))
    expect(props.onSortDirectionChange).toHaveBeenCalledWith('desc')
  })
})
