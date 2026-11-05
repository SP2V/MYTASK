import { describe, expect, it, vi } from 'vitest'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const { toast } = await import('sonner')
const { createAppQueryClient } = await import('@/app/query-client')

describe('createAppQueryClient', () => {
  it('shows one toast per failing query instead of failing silently', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = createAppQueryClient()

    await client
      .fetchQuery({ queryKey: ['tasks'], queryFn: () => Promise.reject(new Error('boom')), retry: false })
      .catch(() => {})

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/unable to load/i),
      expect.objectContaining({ id: 'query-error:["tasks"]', description: 'boom' }),
    )
  })
})
