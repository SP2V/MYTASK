import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-client'

/**
 * Supabase only exposes `provider_refresh_token` on the Session object right
 * after an OAuth redirect — it's not persisted or returned on later session
 * restores, so we capture and store it ourselves the moment it appears.
 * Called from AuthProvider on every SIGNED_IN event; a no-op when the event
 * wasn't the "Connect Google Calendar" consent flow.
 *
 * Written through the `save_google_calendar_token` RPC: the browser can
 * store the token but can never read it back (see migration 0012), so an
 * XSS bug can't exfiltrate a long-lived Google credential.
 */
export async function saveGoogleCalendarTokenIfPresent(session: Session | null): Promise<boolean> {
  const refreshToken = (session as unknown as { provider_refresh_token?: string | null })
    ?.provider_refresh_token
  if (!session?.user || !refreshToken) return false

  const { error } = await supabase.rpc('save_google_calendar_token', { p_refresh_token: refreshToken })
  if (error) throw new Error(error.message)
  return true
}

export async function isGoogleCalendarConnected(): Promise<boolean> {
  const { data, error } = await supabase.from('google_calendar_tokens').select('user_id').maybeSingle()
  if (error) throw new Error(error.message)
  return !!data
}

export async function disconnectGoogleCalendar(): Promise<void> {
  const { error } = await supabase.from('google_calendar_tokens').delete().not('user_id', 'is', null)
  if (error) throw new Error(error.message)
}
