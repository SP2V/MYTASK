import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import type { MockSupabaseClient } from '@/test/supabase-mock'

vi.mock('@/lib/supabase-client', async () => {
  const { createMockSupabaseClient } = await import('@/test/supabase-mock')
  return { supabase: createMockSupabaseClient() }
})

const { supabase } = await import('@/lib/supabase-client')
const { saveGoogleCalendarTokenIfPresent, isGoogleCalendarConnected, disconnectGoogleCalendar } =
  await import('@/features/settings/services/google-calendar-repository')

const mock = supabase as unknown as MockSupabaseClient

function session(refreshToken: string | null): Session {
  return { user: { id: 'user-1' }, provider_refresh_token: refreshToken } as unknown as Session
}

describe('google-calendar-repository', () => {
  beforeEach(() => mock.__reset())

  it('stores the refresh token through the write-only RPC, never a direct table write', async () => {
    const saved = await saveGoogleCalendarTokenIfPresent(session('refresh-123'))

    expect(saved).toBe(true)
    expect(mock.__rpcCalls).toEqual([
      { fn: 'save_google_calendar_token', args: { p_refresh_token: 'refresh-123' } },
    ])
    expect(mock.__store.get('google_calendar_tokens')).toBeUndefined()
  })

  it('is a no-op when the sign-in carried no refresh token', async () => {
    expect(await saveGoogleCalendarTokenIfPresent(session(null))).toBe(false)
    expect(await saveGoogleCalendarTokenIfPresent(null)).toBe(false)
    expect(mock.__rpcCalls).toHaveLength(0)
  })

  it('surfaces a failed save instead of swallowing it', async () => {
    mock.__failNext('rpc:save_google_calendar_token', 'select', 'permission denied')
    await expect(saveGoogleCalendarTokenIfPresent(session('refresh-123'))).rejects.toThrow(
      'permission denied',
    )
  })

  it('reports connection state and surfaces read errors', async () => {
    expect(await isGoogleCalendarConnected()).toBe(false)
    mock.__store.set('google_calendar_tokens', [{ user_id: 'user-1' }])
    expect(await isGoogleCalendarConnected()).toBe(true)

    mock.__failNext('google_calendar_tokens', 'select', 'offline')
    await expect(isGoogleCalendarConnected()).rejects.toThrow('offline')
  })

  it('disconnect deletes the row and surfaces delete errors', async () => {
    mock.__store.set('google_calendar_tokens', [{ user_id: 'user-1' }])
    await disconnectGoogleCalendar()
    expect(mock.__store.get('google_calendar_tokens')).toEqual([])

    mock.__failNext('google_calendar_tokens', 'delete', 'offline')
    await expect(disconnectGoogleCalendar()).rejects.toThrow('offline')
  })
})
