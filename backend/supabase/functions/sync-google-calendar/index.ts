// Supabase Edge Function: sync-google-calendar
//
// Called directly by the frontend (fire-and-forget) right after a task is
// created, updated, or deleted, and after "Connect Google Calendar" links a
// new account. Never blocks task CRUD — the caller ignores failures.
//
// Body shapes:
//   { operation: 'upsert', taskId: string }        - create/update the event for a task
//   { operation: 'delete', googleEventId: string }  - delete an event (task row is already gone)
//
// Required secrets (`supabase secrets set NAME=value`):
//   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET - same OAuth client used for Supabase Auth's
//                                              Google provider, needed to refresh access tokens.
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface TokenRow {
  refresh_token: string
  access_token: string | null
  access_token_expires_at: string | null
  calendar_id: string
}

interface RecurrenceRow {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM'
  interval: number
  daysOfWeek: number[] | null
  dayOfMonth: number | null
  endDate: string | null
  enabled: boolean
}

interface TaskRow {
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

async function getValidAccessToken(
  admin: ReturnType<typeof createClient>,
  userId: string,
  token: TokenRow,
): Promise<string> {
  const expiresAt = token.access_token_expires_at ? new Date(token.access_token_expires_at).getTime() : 0
  if (token.access_token && expiresAt > Date.now() + 60_000) {
    return token.access_token
  }

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`)
  const json = (await res.json()) as { access_token: string; expires_in: number }

  await admin
    .from('google_calendar_tokens')
    .update({
      access_token: json.access_token,
      access_token_expires_at: new Date(Date.now() + json.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  return json.access_token
}

const RRULE_WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
const CALENDAR_TIME_ZONE = 'Asia/Bangkok'

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function timedRange(date: string, rawTime: string): { start: string; end: string } {
  // Postgres `time` values are returned as HH:MM:SS, while the web app uses
  // HH:MM. Do not append seconds blindly: that produced invalid RFC3339 such
  // as `2026-09-30T13:00:00:00+07:00` for every timed task.
  const match = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(rawTime)
  if (!match) throw new Error(`Invalid task due_time: ${rawTime}`)
  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = Number(match[3] ?? '0')
  if (hours > 23 || minutes > 59 || seconds > 59) throw new Error(`Invalid task due_time: ${rawTime}`)

  const start = `${date}T${match[1]}:${match[2]}:${String(seconds).padStart(2, '0')}+07:00`
  const endMinutesOfDay = hours * 60 + minutes + 60
  const endDate = addDays(date, Math.floor(endMinutesOfDay / (24 * 60)))
  const endHour = Math.floor((endMinutesOfDay % (24 * 60)) / 60)
  const endMinute = endMinutesOfDay % 60
  const end = `${endDate}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:${String(seconds).padStart(2, '0')}+07:00`
  return { start, end }
}

// Google's recurrence array takes RFC 5545 RRULE strings. The app's own
// `computeNextOccurrence` (recurrence-engine.ts) only ever advances one step
// at a time, so this mirrors that model as closely as RRULE allows: CUSTOM
// has no RRULE equivalent and is treated as a day-interval like DAILY, and
// MONTHLY's day-of-month clamping (recurrence-engine.ts's addMonthsClamped)
// isn't replicated — RRULE's BYMONTHDAY skips short months instead.
function buildRecurrenceRule(recurrence: RecurrenceRow, isAllDay: boolean): string[] {
  const freq = recurrence.frequency === 'CUSTOM' ? 'DAILY' : recurrence.frequency
  const parts = [`FREQ=${freq}`, `INTERVAL=${Math.max(1, recurrence.interval)}`]
  if (freq === 'WEEKLY' && recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
    parts.push(`BYDAY=${recurrence.daysOfWeek.map((d) => RRULE_WEEKDAYS[d]).join(',')}`)
  }
  if (freq === 'MONTHLY' && recurrence.dayOfMonth) {
    parts.push(`BYMONTHDAY=${recurrence.dayOfMonth}`)
  }
  if (recurrence.endDate) {
    const compact = recurrence.endDate.replace(/-/g, '')
    parts.push(`UNTIL=${isAllDay ? compact : `${compact}T235959Z`}`)
  }
  return [`RRULE:${parts.join(';')}`]
}

function toEventBody(task: TaskRow) {
  const isAllDay = !task.due_time
  const range = !isAllDay && task.due_date && task.due_time
    ? timedRange(task.due_date, task.due_time)
    : null
  const start = isAllDay
    ? { date: task.due_date }
    : { dateTime: range!.start, timeZone: CALENDAR_TIME_ZONE }
  const end = isAllDay
    ? { date: addDays(task.due_date!, 1) }
    : { dateTime: range!.end, timeZone: CALENDAR_TIME_ZONE }
  const recurrence = task.recurrence?.enabled ? buildRecurrenceRule(task.recurrence, isAllDay) : []
  return { summary: task.title, start, end, recurrence, colorId: task.calendar_color_id }
}

async function deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Calendar event delete failed: ${res.status} ${await res.text()}`)
  }
}

// The frontend calls this function directly from the browser via
// supabase.functions.invoke(), which triggers a CORS preflight (OPTIONS).
// Without these headers on every response, the browser blocks the request
// before it ever reaches this handler.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization')
  if (!authHeader)
    return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
      status: 401,
      headers: corsHeaders,
    })

  const asUser = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const {
    data: { user },
  } = await asUser.auth.getUser()
  if (!user)
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: corsHeaders })

  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { data: token } = await admin
    .from('google_calendar_tokens')
    .select('refresh_token, access_token, access_token_expires_at, calendar_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!token) {
    // Calendar isn't connected for this user — nothing to do, not an error.
    return new Response(JSON.stringify({ skipped: true, reason: 'not_connected' }), {
      status: 200,
      headers: corsHeaders,
    })
  }

  const body = (await req.json()) as
    | { operation: 'upsert'; taskId: string }
    | { operation: 'delete'; googleEventId: string }

  try {
    const accessToken = await getValidAccessToken(admin, user.id, token as TokenRow)

    if (body.operation === 'delete') {
      await deleteEvent(accessToken, (token as TokenRow).calendar_id, body.googleEventId)
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders })
    }

    const { data: task } = await admin
      .from('tasks')
      .select('id, user_id, title, status, due_date, due_time, calendar_color_id, google_event_id, recurrence, series_id')
      .eq('id', body.taskId)
      .maybeSingle()

    if (!task || (task as TaskRow).user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Task not found' }), { status: 404, headers: corsHeaders })
    }
    const taskRow = task as TaskRow
    const calendarId = (token as TokenRow).calendar_id
    const isDone = taskRow.status === 'COMPLETED' || taskRow.status === 'ARCHIVED'
    // A generated continuation of a still-recurring series (series_id set,
    // recurrence still enabled) is already covered by the series root's
    // single Google recurring event — nothing new to create for it.
    const isRecurringContinuation = taskRow.series_id !== null && !!taskRow.recurrence?.enabled
    const isRecurringMaster = taskRow.series_id === null && !!taskRow.recurrence?.enabled

    if (isRecurringContinuation) {
      return new Response(JSON.stringify({ ok: true, action: 'skipped_series_continuation' }), {
        status: 200,
        headers: corsHeaders,
      })
    }

    if (isDone || !taskRow.due_date) {
      // Completing one instance of an ongoing series must not delete the
      // recurring master event — that would wipe every future occurrence
      // from Google Calendar too. Only remove the event for a one-off task,
      // or once the series itself has no due date left.
      if (taskRow.google_event_id && !(isDone && isRecurringMaster)) {
        await deleteEvent(accessToken, calendarId, taskRow.google_event_id)
        await admin.from('tasks').update({ google_event_id: null }).eq('id', taskRow.id)
      }
      return new Response(JSON.stringify({ ok: true, action: 'skipped_or_removed' }), {
        status: 200,
        headers: corsHeaders,
      })
    }

    const eventBody = toEventBody(taskRow)
    if (taskRow.google_event_id) {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${taskRow.google_event_id}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(eventBody),
        },
      )
      if (!res.ok) throw new Error(`Calendar event update failed: ${res.status} ${await res.text()}`)
      return new Response(JSON.stringify({ ok: true, action: 'updated' }), {
        status: 200,
        headers: corsHeaders,
      })
    }

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(eventBody),
      },
    )
    if (!res.ok) throw new Error(`Calendar event create failed: ${res.status} ${await res.text()}`)
    const created = (await res.json()) as { id: string }
    await admin.from('tasks').update({ google_event_id: created.id }).eq('id', taskRow.id)

    return new Response(JSON.stringify({ ok: true, action: 'created' }), {
      status: 200,
      headers: corsHeaders,
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
