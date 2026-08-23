import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-client'

/**
 * Supabase only exposes `provider_refresh_token` on the Session object right
 * after an OAuth redirect — it's not persisted or returned on later session
 * restores, so we capture and store it ourselves the moment it appears.
 * Called from AuthProvider on every SIGNED_IN event; a no-op when the event
 * wasn't the "Connect Google Calendar" consent flow.
 */
export async function saveGoogleCalendarTokenIfPresent(session: Session | null): Promise<void> {
  const refreshToken = (session as unknown as { provider_refresh_token?: string | null })
    ?.provider_refresh_token
  if (!session?.user || !refreshToken) return

  await supabase.from('google_calendar_tokens').upsert(
    { user_id: session.user.id, refresh_token: refreshToken },
    { onConflict: 'user_id' },
  )
}

export async function isGoogleCalendarConnected(): Promise<boolean> {
  const { data } = await supabase.from('google_calendar_tokens').select('user_id').maybeSingle()
  return !!data
}

export async function disconnectGoogleCalendar(): Promise<void> {
  await supabase.from('google_calendar_tokens').delete().not('user_id', 'is', null)
}
