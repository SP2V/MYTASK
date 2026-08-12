import { describe, expect, it } from 'vitest'
import {
  compareDateOnly,
  dateToDateOnlyString,
  daysInMonth,
  formatDateForDisplay,
  formatTimeForDisplay,
  isDueToday,
  isLeapYear,
  isOverdue,
  isUpcoming,
  parseDateOnly,
} from '@/lib/date'

describe('parseDateOnly / dateToDateOnlyString', () => {
  it('round-trips without a timezone shift', () => {
    const date = parseDateOnly('2026-03-05')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(2)
    expect(date.getDate()).toBe(5)
    expect(dateToDateOnlyString(date)).toBe('2026-03-05')
  })
})

describe('compareDateOnly', () => {
  it('orders date-only strings lexicographically', () => {
    expect(compareDateOnly('2026-01-01', '2026-01-02')).toBeLessThan(0)
    expect(compareDateOnly('2026-01-02', '2026-01-01')).toBeGreaterThan(0)
    expect(compareDateOnly('2026-01-01', '2026-01-01')).toBe(0)
  })
})

describe('daysInMonth / isLeapYear', () => {
  it('returns correct day counts including leap years', () => {
    expect(daysInMonth(2026, 1)).toBe(28) // Feb 2026
    expect(daysInMonth(2028, 1)).toBe(29) // Feb 2028, leap
    expect(daysInMonth(2026, 3)).toBe(30) // Apr
    expect(daysInMonth(2026, 0)).toBe(31) // Jan
  })

  it('identifies leap years correctly, including century exceptions', () => {
    expect(isLeapYear(2028)).toBe(true)
    expect(isLeapYear(2026)).toBe(false)
    expect(isLeapYear(2000)).toBe(true)
    expect(isLeapYear(1900)).toBe(false)
  })
})

describe('isOverdue', () => {
  const now = new Date(2026, 5, 15, 12, 0, 0)

  it('is never overdue without a due date', () => {
    expect(isOverdue({ dueDate: null, dueTime: null, status: 'TODO' }, now)).toBe(false)
  })

  it('is not overdue for a same-day due date without a time (due end-of-day)', () => {
    expect(isOverdue({ dueDate: '2026-06-15', dueTime: null, status: 'TODO' }, now)).toBe(false)
  })

  it('is overdue once the day has fully passed', () => {
    expect(isOverdue({ dueDate: '2026-06-14', dueTime: null, status: 'TODO' }, now)).toBe(true)
  })

  it('is overdue once a specific due time has passed today', () => {
    expect(isOverdue({ dueDate: '2026-06-15', dueTime: '09:00', status: 'TODO' }, now)).toBe(true)
  })

  it('is not overdue before a specific due time today', () => {
    expect(isOverdue({ dueDate: '2026-06-15', dueTime: '18:00', status: 'TODO' }, now)).toBe(
      false,
    )
  })

  it('is never overdue when completed or archived', () => {
    expect(isOverdue({ dueDate: '2026-06-01', dueTime: null, status: 'COMPLETED' }, now)).toBe(
      false,
    )
    expect(isOverdue({ dueDate: '2026-06-01', dueTime: null, status: 'ARCHIVED' }, now)).toBe(
      false,
    )
  })
})

describe('isDueToday', () => {
  it('matches only the given today string', () => {
    expect(isDueToday({ dueDate: '2026-06-15', dueTime: null }, '2026-06-15')).toBe(true)
    expect(isDueToday({ dueDate: '2026-06-16', dueTime: null }, '2026-06-15')).toBe(false)
    expect(isDueToday({ dueDate: null, dueTime: null }, '2026-06-15')).toBe(false)
  })
})

describe('isUpcoming', () => {
  it('is true only for future incomplete dated tasks', () => {
    expect(
      isUpcoming({ dueDate: '2026-06-16', dueTime: null, status: 'TODO' }, '2026-06-15'),
    ).toBe(true)
    expect(
      isUpcoming({ dueDate: '2026-06-15', dueTime: null, status: 'TODO' }, '2026-06-15'),
    ).toBe(false)
    expect(isUpcoming({ dueDate: null, dueTime: null, status: 'TODO' }, '2026-06-15')).toBe(false)
    expect(
      isUpcoming({ dueDate: '2026-06-20', dueTime: null, status: 'COMPLETED' }, '2026-06-15'),
    ).toBe(false)
  })
})

describe('formatDateForDisplay', () => {
  it('formats according to the requested format', () => {
    expect(formatDateForDisplay('2026-03-05', 'MDY')).toBe('03/05/2026')
    expect(formatDateForDisplay('2026-03-05', 'DMY')).toBe('05/03/2026')
    expect(formatDateForDisplay('2026-03-05', 'YMD')).toBe('2026-03-05')
  })
})

describe('formatTimeForDisplay', () => {
  it('formats 12-hour and 24-hour correctly', () => {
    expect(formatTimeForDisplay('13:30', 'H24')).toBe('13:30')
    expect(formatTimeForDisplay('13:30', 'H12')).toBe('1:30 PM')
    expect(formatTimeForDisplay('00:05', 'H12')).toBe('12:05 AM')
    expect(formatTimeForDisplay('00:05', 'H24')).toBe('00:05')
  })
})
