// Unit tests for the pure logic of the sync-google-calendar Edge Function.
// Run by the frontend's Vitest (see frontend/vite.config.ts `test.include`),
// with Vitest globals — this folder has no node_modules of its own.
import {
  buildRecurrenceRule,
  eventStartDate,
  parseSyncRequest,
  planSync,
  resolveTimeZone,
  timedRange,
  toEventBody,
  zonedTimeToUtc,
  MAX_BATCH,
  type RecurrenceRow,
  type TaskRow,
} from '../supabase/functions/sync-google-calendar/calendar'

function task(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: 'task-1',
    user_id: 'user-1',
    title: 'Dentist',
    status: 'TODO',
    due_date: '2026-03-10',
    due_time: null,
    calendar_color_id: null,
    google_event_id: null,
    recurrence: null,
    series_id: null,
    ...overrides,
  }
}

function recurrence(overrides: Partial<RecurrenceRow> = {}): RecurrenceRow {
  return {
    frequency: 'DAILY',
    interval: 1,
    daysOfWeek: null,
    dayOfMonth: null,
    endDate: null,
    enabled: true,
    ...overrides,
  }
}

describe('parseSyncRequest', () => {
  it('normalises single and batch operations to lists', () => {
    expect(parseSyncRequest({ operation: 'upsert', taskId: 't1', timeZone: 'Europe/Berlin' })).toEqual({
      ok: true,
      value: { operation: 'upsert', taskIds: ['t1'], timeZone: 'Europe/Berlin' },
    })
    expect(parseSyncRequest({ operation: 'delete_many', googleEventIds: ['a', 'b'] })).toEqual({
      ok: true,
      value: { operation: 'delete', googleEventIds: ['a', 'b'], timeZone: null },
    })
  })

  it.each([
    ['not an object', 'hello'],
    ['null', null],
    ['unknown operation', { operation: 'nuke' }],
    ['missing taskId', { operation: 'upsert' }],
    ['empty googleEventId', { operation: 'delete', googleEventId: '  ' }],
    ['non-array batch', { operation: 'upsert_many', taskIds: 't1' }],
    ['empty batch', { operation: 'upsert_many', taskIds: [] }],
    ['non-string in batch', { operation: 'delete_many', googleEventIds: ['a', 3] }],
    ['oversized batch', { operation: 'upsert_many', taskIds: Array.from({ length: MAX_BATCH + 1 }, (_, i) => `t${i}`) }],
  ])('rejects %s', (_label, body) => {
    expect(parseSyncRequest(body).ok).toBe(false)
  })
})

describe('resolveTimeZone', () => {
  it('prefers a valid browser zone, then the configured fallback, then Asia/Bangkok', () => {
    expect(resolveTimeZone('America/New_York', 'Europe/Paris')).toBe('America/New_York')
    expect(resolveTimeZone('Not/AZone', 'Europe/Paris')).toBe('Europe/Paris')
    expect(resolveTimeZone(null, 'Also/Invalid')).toBe('Asia/Bangkok')
    expect(resolveTimeZone(undefined)).toBe('Asia/Bangkok')
  })
})

describe('zonedTimeToUtc', () => {
  it('converts fixed-offset zones', () => {
    expect(new Date(zonedTimeToUtc('2026-03-31', 23, 59, 59, 'Asia/Bangkok')).toISOString()).toBe(
      '2026-03-31T16:59:59.000Z',
    )
  })

  it('accounts for daylight saving time', () => {
    // New York: EST (UTC-5) in January, EDT (UTC-4) in July.
    expect(new Date(zonedTimeToUtc('2026-01-15', 9, 0, 0, 'America/New_York')).toISOString()).toBe(
      '2026-01-15T14:00:00.000Z',
    )
    expect(new Date(zonedTimeToUtc('2026-07-15', 9, 0, 0, 'America/New_York')).toISOString()).toBe(
      '2026-07-15T13:00:00.000Z',
    )
  })
})

describe('timedRange', () => {
  it('returns wall-clock times without an offset (the event timeZone applies)', () => {
    expect(timedRange('2026-09-30', '13:00:00')).toEqual({
      start: '2026-09-30T13:00:00',
      end: '2026-09-30T14:00:00',
    })
    expect(timedRange('2026-09-30', '09:15')).toEqual({
      start: '2026-09-30T09:15:00',
      end: '2026-09-30T10:15:00',
    })
  })

  it('rolls the end over midnight', () => {
    expect(timedRange('2026-12-31', '23:30')).toEqual({
      start: '2026-12-31T23:30:00',
      end: '2027-01-01T00:30:00',
    })
  })

  it('rejects malformed times', () => {
    expect(() => timedRange('2026-01-01', '25:00')).toThrow()
    expect(() => timedRange('2026-01-01', 'noon')).toThrow()
  })
})

describe('buildRecurrenceRule', () => {
  it('uses a UTC UNTIL at the end of the last local day for timed events', () => {
    // 23:59:59 in Bangkok (UTC+7) is 16:59:59Z — not 23:59:59Z, which would
    // allow an extra occurrence before 07:00 the next morning.
    expect(buildRecurrenceRule(recurrence({ endDate: '2026-03-31' }), false, 'Asia/Bangkok')).toEqual([
      'RRULE:FREQ=DAILY;INTERVAL=1;UNTIL=20260331T165959Z',
    ])
  })

  it('uses a DATE UNTIL for all-day events', () => {
    expect(buildRecurrenceRule(recurrence({ endDate: '2026-03-31' }), true, 'Asia/Bangkok')).toEqual([
      'RRULE:FREQ=DAILY;INTERVAL=1;UNTIL=20260331',
    ])
  })

  it('pins weekly series to Monday-start weeks like the app does', () => {
    expect(
      buildRecurrenceRule(recurrence({ frequency: 'WEEKLY', interval: 2, daysOfWeek: [1, 3] }), true, 'UTC'),
    ).toEqual(['RRULE:FREQ=WEEKLY;INTERVAL=2;WKST=MO;BYDAY=MO,WE'])
  })

  it('maps CUSTOM to a day interval and MONTHLY day-of-month to BYMONTHDAY', () => {
    expect(buildRecurrenceRule(recurrence({ frequency: 'CUSTOM', interval: 3 }), true, 'UTC')).toEqual([
      'RRULE:FREQ=DAILY;INTERVAL=3',
    ])
    expect(buildRecurrenceRule(recurrence({ frequency: 'MONTHLY', dayOfMonth: 15 }), true, 'UTC')).toEqual([
      'RRULE:FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15',
    ])
  })
})

describe('toEventBody', () => {
  it('builds an all-day event and clears the timed fields for PATCH', () => {
    expect(toEventBody(task({ calendar_color_id: '5' }), 'Asia/Bangkok')).toEqual({
      summary: 'Dentist',
      start: { date: '2026-03-10', dateTime: null, timeZone: null },
      end: { date: '2026-03-11', dateTime: null, timeZone: null },
      recurrence: [],
      colorId: '5',
    })
  })

  it('builds a timed event in the requested zone and clears the all-day field', () => {
    expect(toEventBody(task({ due_time: '13:00:00' }), 'Europe/Berlin')).toMatchObject({
      start: { dateTime: '2026-03-10T13:00:00', timeZone: 'Europe/Berlin', date: null },
      end: { dateTime: '2026-03-10T14:00:00', timeZone: 'Europe/Berlin', date: null },
    })
  })

  it('can keep a series on its original first day', () => {
    const body = toEventBody(
      task({ due_date: '2026-03-12', due_time: '08:00', recurrence: recurrence() }),
      'Asia/Bangkok',
      '2026-03-01',
    )
    expect(body.start).toMatchObject({ dateTime: '2026-03-01T08:00:00' })
    expect(body.recurrence).toEqual(['RRULE:FREQ=DAILY;INTERVAL=1'])
  })
})

describe('eventStartDate', () => {
  it('reads the first day of all-day and timed events', () => {
    expect(eventStartDate({ start: { date: '2026-03-01' } })).toBe('2026-03-01')
    expect(eventStartDate({ start: { dateTime: '2026-03-01T08:00:00+07:00' } })).toBe('2026-03-01')
    expect(eventStartDate({})).toBeNull()
  })
})

describe('planSync', () => {
  it('keeps the series event when a recurring instance is completed', () => {
    expect(planSync(task({ status: 'COMPLETED', recurrence: recurrence() }))).toEqual({ kind: 'keep' })
  })

  it('removes the event for completed one-offs, archived tasks and tasks without a date', () => {
    expect(planSync(task({ status: 'COMPLETED' }))).toEqual({ kind: 'remove' })
    expect(planSync(task({ status: 'ARCHIVED', recurrence: recurrence() }))).toEqual({ kind: 'remove' })
    expect(planSync(task({ due_date: null }))).toEqual({ kind: 'remove' })
  })

  it('writes active tasks, flagging continuations of a recurring series', () => {
    expect(planSync(task())).toEqual({ kind: 'write', recurring: false, isContinuation: false })
    expect(planSync(task({ recurrence: recurrence() }))).toEqual({
      kind: 'write',
      recurring: true,
      isContinuation: false,
    })
    // Before this fix continuations were skipped, so edits to them never synced.
    expect(planSync(task({ recurrence: recurrence(), series_id: 'root' }))).toEqual({
      kind: 'write',
      recurring: true,
      isContinuation: true,
    })
  })
})
