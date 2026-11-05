import { describe, expect, it } from 'vitest'
import { computeNextOccurrence } from '@/features/tasks/services/recurrence-engine'
import type { Recurrence } from '@/features/tasks/schemas/task.schema'

function recurrence(overrides: Partial<Recurrence>): Recurrence {
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

describe('computeNextOccurrence', () => {
  it('returns null when recurrence is disabled', () => {
    expect(computeNextOccurrence('2026-01-01', recurrence({ enabled: false }))).toBeNull()
  })

  describe('daily', () => {
    it('adds the interval in days', () => {
      expect(computeNextOccurrence('2026-01-01', recurrence({ frequency: 'DAILY' }))).toBe(
        '2026-01-02',
      )
    })

    it('supports a custom interval', () => {
      expect(
        computeNextOccurrence('2026-01-01', recurrence({ frequency: 'DAILY', interval: 3 })),
      ).toBe('2026-01-04')
    })

    it('rolls over a month boundary', () => {
      expect(computeNextOccurrence('2026-01-31', recurrence({ frequency: 'DAILY' }))).toBe(
        '2026-02-01',
      )
    })

    it('rolls over a year boundary', () => {
      expect(computeNextOccurrence('2026-12-31', recurrence({ frequency: 'DAILY' }))).toBe(
        '2027-01-01',
      )
    })
  })

  describe('weekly', () => {
    it('adds 7 days with no specific weekday', () => {
      // 2026-01-01 is a Thursday
      expect(computeNextOccurrence('2026-01-01', recurrence({ frequency: 'WEEKLY' }))).toBe(
        '2026-01-08',
      )
    })

    it('supports a multi-week interval', () => {
      expect(
        computeNextOccurrence('2026-01-01', recurrence({ frequency: 'WEEKLY', interval: 2 })),
      ).toBe('2026-01-15')
    })

    it('finds the next matching weekday (every Monday)', () => {
      // 2026-01-01 is Thursday; next Monday is 2026-01-05
      expect(
        computeNextOccurrence(
          '2026-01-01',
          recurrence({ frequency: 'WEEKLY', daysOfWeek: [1] }),
        ),
      ).toBe('2026-01-05')
    })

    it('finds the next matching day across a week boundary', () => {
      // 2026-01-03 is Saturday; only weekday selected is Monday(1) -> 2026-01-05
      expect(
        computeNextOccurrence(
          '2026-01-03',
          recurrence({ frequency: 'WEEKLY', daysOfWeek: [1] }),
        ),
      ).toBe('2026-01-05')
    })

    it('picks the nearest of multiple selected weekdays', () => {
      // 2026-01-01 Thursday(4); selecting Mon(1) and Fri(5) -> nearest is Friday 2026-01-02
      expect(
        computeNextOccurrence(
          '2026-01-01',
          recurrence({ frequency: 'WEEKLY', daysOfWeek: [1, 5] }),
        ),
      ).toBe('2026-01-02')
    })

    describe('multi-week interval with selected weekdays', () => {
      // Every 2 weeks on Monday + Wednesday. 2026-01-05 is a Monday.
      const everyOtherMonWed = recurrence({ frequency: 'WEEKLY', interval: 2, daysOfWeek: [1, 3] })

      it('stays in the same week for a later selected day', () => {
        expect(computeNextOccurrence('2026-01-05', everyOtherMonWed)).toBe('2026-01-07')
      })

      it('jumps the interval only after the last selected day of the week', () => {
        expect(computeNextOccurrence('2026-01-07', everyOtherMonWed)).toBe('2026-01-19')
      })

      it('walks a full series consistently', () => {
        const dates = ['2026-01-05']
        for (let i = 0; i < 5; i++) {
          dates.push(computeNextOccurrence(dates[dates.length - 1]!, everyOtherMonWed)!)
        }
        expect(dates).toEqual([
          '2026-01-05',
          '2026-01-07',
          '2026-01-19',
          '2026-01-21',
          '2026-02-02',
          '2026-02-04',
        ])
      })

      it('treats Sunday as the end of a Monday-start week (RRULE WKST=MO)', () => {
        // Every 3 weeks on Saturday + Sunday. 2026-01-10 is a Saturday.
        const rule = recurrence({ frequency: 'WEEKLY', interval: 3, daysOfWeek: [6, 0] })
        expect(computeNextOccurrence('2026-01-10', rule)).toBe('2026-01-11')
        expect(computeNextOccurrence('2026-01-11', rule)).toBe('2026-01-31')
      })

      it('respects the series end date', () => {
        expect(
          computeNextOccurrence('2026-01-07', { ...everyOtherMonWed, endDate: '2026-01-18' }),
        ).toBeNull()
      })
    })
  })

  describe('monthly', () => {
    it('adds one month keeping the same day', () => {
      expect(computeNextOccurrence('2026-01-15', recurrence({ frequency: 'MONTHLY' }))).toBe(
        '2026-02-15',
      )
    })

    it('clamps day 31 into a 30-day month', () => {
      expect(computeNextOccurrence('2026-01-31', recurrence({ frequency: 'MONTHLY' }))).toBe(
        '2026-02-28',
      )
    })

    it('clamps day 31 into February on a leap year', () => {
      expect(computeNextOccurrence('2027-01-31', recurrence({ frequency: 'MONTHLY' }))).toBe(
        '2027-02-28',
      )
    })

    it('clamps into February 29 on a leap year when dayOfMonth is 29', () => {
      expect(
        computeNextOccurrence(
          '2028-01-15',
          recurrence({ frequency: 'MONTHLY', dayOfMonth: 29 }),
        ),
      ).toBe('2028-02-29')
    })

    it('rolls over a year boundary', () => {
      expect(computeNextOccurrence('2026-12-15', recurrence({ frequency: 'MONTHLY' }))).toBe(
        '2027-01-15',
      )
    })

    it('respects a custom dayOfMonth override', () => {
      expect(
        computeNextOccurrence(
          '2026-01-05',
          recurrence({ frequency: 'MONTHLY', dayOfMonth: 20 }),
        ),
      ).toBe('2026-02-20')
    })
  })

  describe('yearly', () => {
    it('adds one year keeping month and day', () => {
      expect(computeNextOccurrence('2026-03-10', recurrence({ frequency: 'YEARLY' }))).toBe(
        '2027-03-10',
      )
    })

    it('clamps Feb 29 into Feb 28 on a non-leap year', () => {
      expect(computeNextOccurrence('2028-02-29', recurrence({ frequency: 'YEARLY' }))).toBe(
        '2029-02-28',
      )
    })

    it('keeps Feb 29 across leap years (interval 4)', () => {
      expect(
        computeNextOccurrence('2028-02-29', recurrence({ frequency: 'YEARLY', interval: 4 })),
      ).toBe('2032-02-29')
    })
  })

  describe('custom', () => {
    it('treats interval as days', () => {
      expect(
        computeNextOccurrence('2026-01-01', recurrence({ frequency: 'CUSTOM', interval: 10 })),
      ).toBe('2026-01-11')
    })
  })

  describe('endDate', () => {
    it('returns null once the next occurrence passes the end date', () => {
      expect(
        computeNextOccurrence(
          '2026-01-30',
          recurrence({ frequency: 'DAILY', endDate: '2026-01-31' }),
        ),
      ).toBe('2026-01-31')
      expect(
        computeNextOccurrence(
          '2026-01-31',
          recurrence({ frequency: 'DAILY', endDate: '2026-01-31' }),
        ),
      ).toBeNull()
    })
  })
})
