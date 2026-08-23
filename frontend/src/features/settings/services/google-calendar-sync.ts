import { supabase } from '@/lib/supabase-client'

/**
 * Fire-and-forget: task CRUD must never fail or block because Google
 * Calendar sync failed (token expired, API down, user never connected it).
 * The Edge Function itself no-ops if the user hasn't connected a calendar.
 */
export function syncTaskToGoogleCalendar(taskId: string): void {
  void supabase.functions.invoke('sync-google-calendar', { body: { operation: 'upsert', taskId } })
}

export function deleteGoogleCalendarEvent(googleEventId: string): void {
  void supabase.functions.invoke('sync-google-calendar', {
    body: { operation: 'delete', googleEventId },
  })
}
