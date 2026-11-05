import type { Recurrence } from '@/features/tasks/schemas/task.schema'
import { compareDateOnly, dateToDateOnlyString, daysInMonth, parseDateOnly } from '@/lib/date'

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function addMonthsClamped(date: Date, months: number, dayOverride: number | null): Date {
  const day = dayOverride ?? date.getDate()
  const targetMonthIndex = date.getMonth() + months
  const targetYear = date.getFullYear() + Math.floor(targetMonthIndex / 12)
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12
  const maxDay = daysInMonth(targetYear, normalizedMonth)
  return new Date(targetYear, normalizedMonth, Math.min(day, maxDay))
}

function addYearsClamped(date: Date, years: number): Date {
  const targetYear = date.getFullYear() + years
  const month = date.getMonth()
  const maxDay = daysInMonth(targetYear, month)
  return new Date(targetYear, month, Math.min(date.getDate(), maxDay))
}

/** Position of a date within a Monday-start week: Mon=0 … Sun=6. */
function mondayWeekPosition(date: Date): number {
  return (date.getDay() + 6) % 7
}

/**
 * Weeks start on Monday here to match RFC 5545's default `WKST=MO`, which is
 * what Google Calendar uses for the RRULE the sync function sends — so the
 * app and the calendar agree on which week an occurrence falls in.
 *
 * Remaining selected days in the current week come first; only once the
 * week is exhausted does the series jump `interval` weeks ahead. (Adding the
 * interval to every step would wrongly skip e.g. the Wednesday right after
 * a Monday in an "every 2 weeks on Mon+Wed" series.)
 */
function nextWeekly(current: Date, interval: number, daysOfWeek: number[] | null): Date {
  if (!daysOfWeek || daysOfWeek.length === 0) {
    return addDays(current, 7 * interval)
  }
  const selected = new Set(daysOfWeek)
  const position = mondayWeekPosition(current)

  for (let offset = 1; position + offset <= 6; offset++) {
    const candidate = addDays(current, offset)
    if (selected.has(candidate.getDay())) return candidate
  }

  const targetWeekStart = addDays(current, 7 * interval - position)
  for (let offset = 0; offset < 7; offset++) {
    const candidate = addDays(targetWeekStart, offset)
    if (selected.has(candidate.getDay())) return candidate
  }
  return addDays(current, 7 * interval)
}

/**
 * Computes the next occurrence date for a recurring task, given the due date
 * the just-completed instance had. Returns null when recurrence is disabled
 * or the computed date falls after the series endDate.
 */
export function computeNextOccurrence(
  currentDueDate: string,
  recurrence: Recurrence,
): string | null {
  if (!recurrence.enabled) return null

  const current = parseDateOnly(currentDueDate)
  const interval = Math.max(1, recurrence.interval)

  let next: Date
  switch (recurrence.frequency) {
    case 'DAILY':
      next = addDays(current, interval)
      break
    case 'WEEKLY':
      next = nextWeekly(current, interval, recurrence.daysOfWeek)
      break
    case 'MONTHLY':
      next = addMonthsClamped(current, interval, recurrence.dayOfMonth)
      break
    case 'YEARLY':
      next = addYearsClamped(current, interval)
      break
    case 'CUSTOM':
      next = addDays(current, interval)
      break
    default:
      return null
  }

  const nextDateString = dateToDateOnlyString(next)

  if (recurrence.endDate && compareDateOnly(nextDateString, recurrence.endDate) > 0) {
    return null
  }

  return nextDateString
}
