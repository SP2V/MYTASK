import { supabase } from '@/lib/supabase-client'

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  if (error) throw new Error(error.message)
}

/**
 * Requests the Calendar scope on top of the existing sign-in, with
 * `prompt: 'consent'` so Google always returns a refresh token (it's only
 * issued on the first consent otherwise). Kept separate from
 * `signInWithGoogle` so plain sign-in never asks for calendar access.
 */
export async function connectGoogleCalendar(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/settings`,
      scopes: 'https://www.googleapis.com/auth/calendar.events',
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  })
  if (error) throw new Error(error.message)
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

/** The `settings` table is keyed by user id — every settings query needs this. */
export async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Not authenticated')
  return data.user.id
}
