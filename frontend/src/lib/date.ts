import type { DateFormatOption, TimeFormatOption } from '@/features/settings/schemas/settings.schema'

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

/** Local-timezone "today" as a YYYY-MM-DD string. Never derive this from toISOString(). */
export function todayDateString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function nowISO(): string {
  return new Date().toISOString()
}

/** Parse a YYYY-MM-DD string as a local-midnight Date, never shifting a day via UTC parsing. */
export function parseDateOnly(dateStr: string): Date {
  const parts = dateStr.split('-')
  const year = Number(parts[0])
  const month = Number(parts[1])
  const day = Number(parts[2])
  return new Date(year, month - 1, day)
}

export function dateToDateOnlyString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function compareDateOnly(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function isValidDateOnly(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
  const d = parseDateOnly(dateStr)
  return dateToDateOnlyString(d) === dateStr
}

export function daysInMonth(year: number, monthIndexZeroBased: number): number {
  return new Date(year, monthIndexZeroBased + 1, 0).getDate()
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

interface TaskDueLike {
  dueDate: string | null
  dueTime: string | null
}

/**
 * The exact moment a task is "due" for overdue comparisons. A date-only task
 * (no dueTime) is due at end-of-day, not midnight, since "due today" should
 * not be overdue until the day has actually passed.
 */
export function getTaskDueMoment(task: TaskDueLike): Date | null {
  if (!task.dueDate) return null
  const base = parseDateOnly(task.dueDate)
  if (task.dueTime) {
    const timeParts = task.dueTime.split(':')
    const hours = Number(timeParts[0])
    const minutes = Number(timeParts[1])
    base.setHours(hours, minutes, 0, 0)
  } else {
    base.setHours(23, 59, 59, 999)
  }
  return base
}

interface TaskStatusLike {
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED'
}

/** Business rule: a task without a due date can never be overdue. */
export function isOverdue(task: TaskDueLike & TaskStatusLike, now: Date = new Date()): boolean {
  if (task.status === 'COMPLETED' || task.status === 'ARCHIVED') return false
  const dueMoment = getTaskDueMoment(task)
  if (!dueMoment) return false
  return dueMoment.getTime() < now.getTime()
}

export function isDueToday(task: TaskDueLike, today: string = todayDateString()): boolean {
  return task.dueDate === today
}

export function isUpcoming(
  task: TaskDueLike & TaskStatusLike,
  today: string = todayDateString(),
): boolean {
  if (task.status === 'COMPLETED' || task.status === 'ARCHIVED') return false
  if (!task.dueDate) return false
  return compareDateOnly(task.dueDate, today) > 0
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export function formatDateForDisplay(dateStr: string, format: DateFormatOption): string {
  const d = parseDateOnly(dateStr)
  const day = pad(d.getDate())
  const month = pad(d.getMonth() + 1)
  const year = d.getFullYear()
  switch (format) {
    case 'DMY':
      return `${day}/${month}/${year}`
    case 'YMD':
      return `${year}-${month}-${day}`
    case 'MDY':
    default:
      return `${month}/${day}/${year}`
  }
}

export function formatDateShort(dateStr: string): string {
  const d = parseDateOnly(dateStr)
  return `${MONTH_NAMES[d.getMonth()] ?? ''} ${d.getDate()}`
}

export function formatTimeForDisplay(timeStr: string, format: TimeFormatOption): string {
  const timeParts = timeStr.split(':')
  const hours = Number(timeParts[0])
  const minutes = Number(timeParts[1])
  if (format === 'H24') {
    return `${pad(hours)}:${pad(minutes)}`
  }
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 === 0 ? 12 : hours % 12
  return `${displayHours}:${pad(minutes)} ${period}`
}
