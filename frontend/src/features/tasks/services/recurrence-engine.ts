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

function nextWeekly(current: Date, interval: number, daysOfWeek: number[] | null): Date {
  if (!daysOfWeek || daysOfWeek.length === 0) {
    return addDays(current, 7 * interval)
  }
  const sorted = [...daysOfWeek].sort((a, b) => a - b)
  let match: Date | null = null
  for (let offset = 1; offset <= 7; offset++) {
    const candidate = addDays(current, offset)
    if (sorted.includes(candidate.getDay())) {
      match = candidate
      break
    }
  }
  if (!match) {
    match = addDays(current, 7)
  }
  if (interval > 1) {
    match = addDays(match, 7 * (interval - 1))
  }
  return match
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
