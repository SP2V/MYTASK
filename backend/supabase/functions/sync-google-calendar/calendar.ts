// Pure helpers for the sync-google-calendar Edge Function: request parsing,
// time-zone math and Google Calendar event bodies. No Deno or network APIs
// here, so the logic is unit-tested with Vitest (backend/tests/).

export interface RecurrenceRow {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM'
  interval: number
  daysOfWeek: number[] | null
  dayOfMonth: number | null
  endDate: string | null
  enabled: boolean
}

export interface TaskRow {
  id: string
  user_id: string
  title: string
  status: string
  due_date: string | null
  due_time: string | null
  calendar_color_id: string | null
  google_event_id: string | null
  recurrence: RecurrenceRow | null
  series_id: string | null
}

// ---------------------------------------------------------------------------
// Request body

export const MAX_BATCH = 50

export type SyncRequest =
  | { operation: 'upsert'; taskIds: string[]; timeZone: string | null }
  | { operation: 'delete'; googleEventIds: string[]; timeZone: string | null }

type ParseResult = { ok: true; value: SyncRequest } | { ok: false; error: string }

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 1024
}

function stringList(value: unknown, field: string): string[] | string {
  if (!Array.isArray(value) || value.length === 0) return `${field} must be a non-empty array`
  if (value.length > MAX_BATCH) return `${field} may contain at most ${MAX_BATCH} items`
  if (!value.every(isNonEmptyString)) return `${field} must contain only non-empty strings`
  return value
}

/**
 * Accepted shapes (single and batch forms are normalised to lists):
 *   { operation: 'upsert', taskId }              { operation: 'upsert_many', taskIds }
 *   { operation: 'delete', googleEventId }       { operation: 'delete_many', googleEventIds }
 * plus an optional `timeZone` (IANA name) from the browser.
 */
export function parseSyncRequest(raw: unknown): ParseResult {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'Body must be a JSON object' }
  const body = raw as Record<string, unknown>
  const timeZone = typeof body.timeZone === 'string' ? body.timeZone : null

  switch (body.operation) {
    case 'upsert':
      return isNonEmptyString(body.taskId)
        ? { ok: true, value: { operation: 'upsert', taskIds: [body.taskId], timeZone } }
        : { ok: false, error: 'taskId is required' }
    case 'delete':
      return isNonEmptyString(body.googleEventId)
        ? { ok: true, value: { operation: 'delete', googleEventIds: [body.googleEventId], timeZone } }
        : { ok: false, error: 'googleEventId is required' }
    case 'upsert_many': {
      const ids = stringList(body.taskIds, 'taskIds')
      return typeof ids === 'string'
        ? { ok: false, error: ids }
        : { ok: true, value: { operation: 'upsert', taskIds: ids, timeZone } }
    }
    case 'delete_many': {
      const ids = stringList(body.googleEventIds, 'googleEventIds')
      return typeof ids === 'string'
        ? { ok: false, error: ids }
        : { ok: true, value: { operation: 'delete', googleEventIds: ids, timeZone } }
    }
    default:
      return { ok: false, error: 'Unknown operation' }
  }
}

// ---------------------------------------------------------------------------
// Time zones

export const DEFAULT_TIME_ZONE = 'Asia/Bangkok'

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

/** The browser's zone when valid, else the configured fallback, else Asia/Bangkok. */
export function resolveTimeZone(requested: string | null | undefined, fallback?: string | null): string {
  if (requested && isValidTimeZone(requested)) return requested
  if (fallback && isValidTimeZone(fallback)) return fallback
  return DEFAULT_TIME_ZONE
}

/** Offset of `timeZone` from UTC at the instant `utcMs`, in milliseconds. */
function timeZoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - Math.floor(utcMs / 1000) * 1000
}

/** Converts a wall-clock time in `timeZone` to a UTC timestamp (ms). DST-aware. */
export function zonedTimeToUtc(
  date: string,
  hours: number,
  minutes: number,
  seconds: number,
  timeZone: string,
): number {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number]
  const guess = Date.UTC(year, month - 1, day, hours, minutes, seconds)
  const firstOffset = timeZoneOffsetMs(guess, timeZone)
  let result = guess - firstOffset
  const secondOffset = timeZoneOffsetMs(result, timeZone)
  if (secondOffset !== firstOffset) result = guess - secondOffset
  return result
}

function compactUtc(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

// ---------------------------------------------------------------------------
// Event bodies

const RRULE_WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function parseTime(rawTime: string): { hours: number; minutes: number; seconds: number } {
  // Postgres `time` values come back as HH:MM:SS, the web app uses HH:MM.
  const match = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(rawTime)
  if (!match) throw new Error(`Invalid task due_time: ${rawTime}`)
  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = Number(match[3] ?? '0')
  if (hours > 23 || minutes > 59 || seconds > 59) throw new Error(`Invalid task due_time: ${rawTime}`)
  return { hours, minutes, seconds }
}

/**
 * One-hour event as wall-clock times with no UTC offset: Google interprets
 * them in the event's `timeZone`, which also keeps a recurring series at the
 * same local time across DST changes.
 */
export function timedRange(date: string, rawTime: string): { start: string; end: string } {
  const { hours, minutes, seconds } = parseTime(rawTime)
  const start = `${date}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  const endMinutesOfDay = hours * 60 + minutes + 60
  const endDate = addDays(date, Math.floor(endMinutesOfDay / (24 * 60)))
  const endHour = Math.floor((endMinutesOfDay % (24 * 60)) / 60)
  const endMinute = endMinutesOfDay % 60
  const end = `${endDate}T${pad(endHour)}:${pad(endMinute)}:${pad(seconds)}`
  return { start, end }
}

/**
 * RFC 5545 RRULE matching the app's recurrence engine as closely as RRULE
 * allows: CUSTOM is a day interval like DAILY, weeks start on Monday
 * (WKST=MO, as in recurrence-engine.ts), and MONTHLY's day-of-month clamping
 * isn't replicated (BYMONTHDAY skips short months instead).
 *
 * UNTIL must be UTC for timed events — the end of the series' last day in
 * the event's time zone, not 23:59:59 UTC (which in UTC+7 would allow one
 * extra early-morning occurrence the next day).
 */
export function buildRecurrenceRule(recurrence: RecurrenceRow, isAllDay: boolean, timeZone: string): string[] {
  const freq = recurrence.frequency === 'CUSTOM' ? 'DAILY' : recurrence.frequency
  const parts = [`FREQ=${freq}`, `INTERVAL=${Math.max(1, recurrence.interval)}`]
  if (freq === 'WEEKLY') {
    parts.push('WKST=MO')
    if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
      parts.push(`BYDAY=${recurrence.daysOfWeek.map((d) => RRULE_WEEKDAYS[d]).join(',')}`)
    }
  }
  if (freq === 'MONTHLY' && recurrence.dayOfMonth) {
    parts.push(`BYMONTHDAY=${recurrence.dayOfMonth}`)
  }
  if (recurrence.endDate) {
    parts.push(
      `UNTIL=${
        isAllDay
          ? recurrence.endDate.replace(/-/g, '')
          : compactUtc(zonedTimeToUtc(recurrence.endDate, 23, 59, 59, timeZone))
      }`,
    )
  }
  return [`RRULE:${parts.join(';')}`]
}

/**
 * Event body for create and PATCH. `startDate` overrides the task's due date
 * (used to keep a recurring series' original first day). The unused one of
 * `date`/`dateTime` is sent as null so a PATCH can switch an event between
 * all-day and timed — PATCH merges nested objects otherwise.
 */
export function toEventBody(task: TaskRow, timeZone: string, startDate?: string) {
  const date = startDate ?? task.due_date
  if (!date) throw new Error('Task has no due date')
  const isAllDay = !task.due_time
  const recurrence = task.recurrence?.enabled ? buildRecurrenceRule(task.recurrence, isAllDay, timeZone) : []

  if (isAllDay) {
    return {
      summary: task.title,
      start: { date, dateTime: null, timeZone: null },
      end: { date: addDays(date, 1), dateTime: null, timeZone: null },
      recurrence,
      colorId: task.calendar_color_id,
    }
  }
  const range = timedRange(date, task.due_time!)
  return {
    summary: task.title,
    start: { dateTime: range.start, timeZone, date: null },
    end: { dateTime: range.end, timeZone, date: null },
    recurrence,
    colorId: task.calendar_color_id,
  }
}

/** First day of an existing Google event (the series' DTSTART for a recurring one). */
export function eventStartDate(event: { start?: { date?: string | null; dateTime?: string | null } }): string | null {
  return event.start?.date ?? event.start?.dateTime?.slice(0, 10) ?? null
}

// ---------------------------------------------------------------------------
// What to do with a task

export type SyncPlan =
  | { kind: 'keep' }
  | { kind: 'remove' }
  | { kind: 'write'; recurring: boolean; isContinuation: boolean }

/**
 * - A completed instance of a recurring series keeps the series event: the
 *   next occurrence takes it over (see index.ts) rather than deleting every
 *   future occurrence from Google Calendar.
 * - Completed one-offs, archived tasks (archiving ends a series) and tasks
 *   without a due date have no event.
 * - Everything else is created/updated. A continuation (series_id set) of a
 *   recurring series updates the shared series event.
 */
export function planSync(task: TaskRow): SyncPlan {
  const recurring = !!task.recurrence?.enabled
  if (task.status === 'COMPLETED' && recurring) return { kind: 'keep' }
  if (task.status === 'COMPLETED' || task.status === 'ARCHIVED' || !task.due_date) return { kind: 'remove' }
  return { kind: 'write', recurring, isContinuation: recurring && task.series_id !== null }
}
