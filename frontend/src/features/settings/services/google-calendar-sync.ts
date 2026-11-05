import { supabase } from '@/lib/supabase-client'

const FUNCTION_NAME = 'sync-google-calendar'
/** Keeps each Edge Function call well inside its execution time limit. */
const BATCH_SIZE = 25

/**
 * Task times are entered in the browser's local time, so the Edge Function
 * needs this zone to place timed events correctly on Google Calendar.
 */
function clientTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined
  } catch {
    return undefined
  }
}

async function invokeSync(body: Record<string, unknown>): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke(FUNCTION_NAME, {
      body: { ...body, timeZone: clientTimeZone() },
    })
    if (error) console.warn('Google Calendar sync failed:', error)
  } catch (error) {
    console.warn('Google Calendar sync failed:', error)
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

async function runBatches(
  items: string[],
  makeBody: (batch: string[]) => Record<string, unknown>,
): Promise<void> {
  // Sequential on purpose: a large import should not fire dozens of
  // concurrent Google API calls and trip its rate limit.
  for (const batch of chunk(items, BATCH_SIZE)) await invokeSync(makeBody(batch))
}

/**
 * Fire-and-forget: task CRUD must never fail or block because Google
 * Calendar sync failed (token expired, API down, user never connected it).
 * The Edge Function itself no-ops if the user hasn't connected a calendar.
 * Failures are logged, never thrown.
 */
export function syncTaskToGoogleCalendar(taskId: string): void {
  void invokeSync({ operation: 'upsert', taskId })
}

export function syncTasksToGoogleCalendar(taskIds: string[]): Promise<void> {
  const unique = [...new Set(taskIds)]
  return runBatches(unique, (batch) => ({ operation: 'upsert_many', taskIds: batch }))
}

export function deleteGoogleCalendarEvent(googleEventId: string): void {
  void invokeSync({ operation: 'delete', googleEventId })
}

export function deleteGoogleCalendarEvents(googleEventIds: string[]): Promise<void> {
  const unique = [...new Set(googleEventIds.filter(Boolean))]
  return runBatches(unique, (batch) => ({ operation: 'delete_many', googleEventIds: batch }))
}
