// Supabase Edge Function: sync-google-calendar
//
// Called directly by the frontend (fire-and-forget) right after a task is
// created, updated, or deleted, after an import / Clear All Data, and after
// "Connect Google Calendar" links a new account. Never blocks task CRUD — the
// caller only logs failures.
//
// Body shapes (see parseSyncRequest in calendar.ts):
//   { operation: 'upsert', taskId }                 create/update the event for a task
//   { operation: 'upsert_many', taskIds }           same, up to 50 tasks
//   { operation: 'delete', googleEventId }          delete an event (task row is already gone)
//   { operation: 'delete_many', googleEventIds }    same, up to 50 events
//   optional `timeZone`: the browser's IANA zone, used to place timed events.
//
// Required secrets (`supabase secrets set NAME=value`):
//   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET - same OAuth client used for Supabase Auth's
//                                              Google provider, needed to refresh access tokens.
// Optional: CALENDAR_TIME_ZONE - fallback zone when the request has none (default Asia/Bangkok).
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.109.0'
import {
  eventStartDate,
  parseSyncRequest,
  planSync,
  resolveTimeZone,
  toEventBody,
  type TaskRow,
} from './calendar.ts'

interface TokenRow {
  refresh_token: string
  access_token: string | null
  access_token_expires_at: string | null
  calendar_id: string
}

const TASK_COLUMNS =
  'id, user_id, title, status, due_date, due_time, calendar_color_id, google_event_id, recurrence, series_id'

// The frontend calls this function directly from the browser via
// supabase.functions.invoke(), which triggers a CORS preflight (OPTIONS).
// Without these headers on every response, the browser blocks the request
// before it ever reaches this handler.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function getValidAccessToken(admin: SupabaseClient, userId: string, token: TokenRow): Promise<string> {
  const expiresAt = token.access_token_expires_at ? new Date(token.access_token_expires_at).getTime() : 0
  if (token.access_token && expiresAt > Date.now() + 60_000) {
    return token.access_token
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`)
  const body = (await res.json()) as { access_token: string; expires_in: number }

  await admin
    .from('google_calendar_tokens')
    .update({
      access_token: body.access_token,
      access_token_expires_at: new Date(Date.now() + body.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  return body.access_token
}

class GoogleCalendar {
  constructor(
    private readonly accessToken: string,
    private readonly calendarId: string,
  ) {}

  private url(eventId?: string): string {
    const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}/events`
    return eventId ? `${base}/${encodeURIComponent(eventId)}` : base
  }

  private headers(): HeadersInit {
    return { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' }
  }

  /** null when the event no longer exists (deleted in Google, 404/410, or cancelled). */
  async get(eventId: string): Promise<{ status?: string; start?: { date?: string; dateTime?: string } } | null> {
    const res = await fetch(this.url(eventId), { headers: this.headers() })
    if (res.status === 404 || res.status === 410) return null
    if (!res.ok) throw new Error(`Calendar event read failed: ${res.status} ${await res.text()}`)
    const event = await res.json()
    return event.status === 'cancelled' ? null : event
  }

  /** false when the event no longer exists, so the caller can recreate it. */
  async patch(eventId: string, body: unknown): Promise<boolean> {
    const res = await fetch(this.url(eventId), { method: 'PATCH', headers: this.headers(), body: JSON.stringify(body) })
    if (res.status === 404 || res.status === 410) return false
    if (!res.ok) throw new Error(`Calendar event update failed: ${res.status} ${await res.text()}`)
    const event = (await res.json()) as { status?: string }
    return event.status !== 'cancelled'
  }

  async create(body: unknown): Promise<string> {
    const res = await fetch(this.url(), { method: 'POST', headers: this.headers(), body: JSON.stringify(body) })
    if (!res.ok) throw new Error(`Calendar event create failed: ${res.status} ${await res.text()}`)
    return ((await res.json()) as { id: string }).id
  }

  async delete(eventId: string): Promise<void> {
    const res = await fetch(this.url(eventId), { method: 'DELETE', headers: this.headers() })
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      throw new Error(`Calendar event delete failed: ${res.status} ${await res.text()}`)
    }
  }
}

interface SyncContext {
  admin: SupabaseClient
  userId: string
  calendar: GoogleCalendar
  timeZone: string
}

async function setEventId(ctx: SyncContext, taskId: string, eventId: string | null): Promise<void> {
  const { error } = await ctx.admin
    .from('tasks')
    .update({ google_event_id: eventId })
    .eq('id', taskId)
    .eq('user_id', ctx.userId)
  if (error) throw new Error(`Saving google_event_id failed: ${error.message}`)
}

/**
 * A recurring series is one Google event shared by all its task instances,
 * but only one row may hold its id — otherwise deleting an old completed
 * instance would delete the whole series. Ownership moves to whichever active
 * instance is being synced (normally the newest occurrence, right after the
 * previous one is completed).
 */
async function adoptSeriesEvent(ctx: SyncContext, task: TaskRow): Promise<string | null> {
  const seriesKey = task.series_id ?? task.id
  const { data: holder, error } = await ctx.admin
    .from('tasks')
    .select('id, google_event_id')
    .eq('user_id', ctx.userId)
    .neq('id', task.id)
    .not('google_event_id', 'is', null)
    .or(`id.eq.${seriesKey},series_id.eq.${seriesKey}`)
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Looking up the series event failed: ${error.message}`)
  if (!holder) return null

  const eventId = (holder as { google_event_id: string }).google_event_id
  await setEventId(ctx, task.id, eventId)
  await setEventId(ctx, (holder as { id: string }).id, null)
  return eventId
}

async function syncTask(ctx: SyncContext, taskId: string): Promise<string> {
  const { data, error } = await ctx.admin
    .from('tasks')
    .select(TASK_COLUMNS)
    .eq('id', taskId)
    .eq('user_id', ctx.userId)
    .maybeSingle()
  if (error) throw new Error(`Reading the task failed: ${error.message}`)
  if (!data) return 'not_found'
  const task = data as TaskRow
  const plan = planSync(task)

  if (plan.kind === 'keep') return 'kept_series_event'

  if (plan.kind === 'remove') {
    if (!task.google_event_id) return 'nothing_to_remove'
    await ctx.calendar.delete(task.google_event_id)
    await setEventId(ctx, task.id, null)
    return 'removed'
  }

  let eventId = task.google_event_id
  if (!eventId && plan.recurring) eventId = await adoptSeriesEvent(ctx, task)

  if (eventId) {
    // A later instance must not move the series' first day — that would
    // erase every earlier occurrence from Google Calendar.
    let startDate: string | undefined
    let exists = true
    if (plan.isContinuation) {
      const event = await ctx.calendar.get(eventId)
      exists = event !== null
      startDate = (event && eventStartDate(event)) ?? undefined
    }
    if (exists && (await ctx.calendar.patch(eventId, toEventBody(task, ctx.timeZone, startDate)))) {
      return 'updated'
    }
    // Deleted on the Google side: fall through and recreate it.
  }

  const createdId = await ctx.calendar.create(toEventBody(task, ctx.timeZone))
  await setEventId(ctx, task.id, createdId)
  return eventId ? 'recreated' : 'created'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing Authorization' }, 401)

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return json({ error: 'Body must be valid JSON' }, 400)
  }
  const parsed = parseSyncRequest(rawBody)
  if (!parsed.ok) return json({ error: parsed.error }, 400)
  const request = parsed.value

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const asUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
    } = await asUser.auth.getUser()
    if (!user) return json({ error: 'Not authenticated' }, 401)

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: token, error: tokenError } = await admin
      .from('google_calendar_tokens')
      .select('refresh_token, access_token, access_token_expires_at, calendar_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (tokenError) throw new Error(tokenError.message)
    // Calendar isn't connected for this user — nothing to do, not an error.
    if (!token) return json({ skipped: true, reason: 'not_connected' })

    const tokenRow = token as TokenRow
    const accessToken = await getValidAccessToken(admin, user.id, tokenRow)
    const ctx: SyncContext = {
      admin,
      userId: user.id,
      calendar: new GoogleCalendar(accessToken, tokenRow.calendar_id),
      timeZone: resolveTimeZone(request.timeZone, Deno.env.get('CALENDAR_TIME_ZONE')),
    }

    // Sequential: keeps Google API usage gentle and series ownership moves
    // (adoptSeriesEvent) free of races within one request.
    const results: { id: string; action?: string; error?: string }[] = []
    if (request.operation === 'delete') {
      for (const eventId of request.googleEventIds) {
        try {
          await ctx.calendar.delete(eventId)
          results.push({ id: eventId, action: 'deleted' })
        } catch (err) {
          results.push({ id: eventId, error: err instanceof Error ? err.message : String(err) })
        }
      }
    } else {
      for (const taskId of request.taskIds) {
        try {
          results.push({ id: taskId, action: await syncTask(ctx, taskId) })
        } catch (err) {
          results.push({ id: taskId, error: err instanceof Error ? err.message : String(err) })
        }
      }
    }

    const failed = results.filter((r) => r.error)
    if (results.length === 1) {
      return failed.length ? json({ error: failed[0]!.error }, 500) : json({ ok: true, action: results[0]!.action })
    }
    return json({ ok: failed.length === 0, results }, failed.length === results.length ? 500 : 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
