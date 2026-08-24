import { describe, expect, it } from 'vitest'
import {
  formatDateValue,
  formatShortMonth,
  getCalendarDayDate,
  getDays,
} from './calendarUtils'
import type { CalendarMonth } from './calendarTypes'

describe('formatDateValue', () => {
  it('YYYY-MM-DD にゼロ埋めして整形する', () => {
    expect(formatDateValue(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(formatDateValue(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})

describe('formatShortMonth', () => {
  it('月番号(0始まり)を「N英字月」に整形する', () => {
    expect(formatShortMonth(2026, 0)).toBe('1JAN')
    expect(formatShortMonth(2026, 11)).toBe('12DEC')
  })
})

describe('getDays', () => {
  it('常に42マス(6週)を返す', () => {
    expect(getDays(2026, 7)).toHaveLength(42)
    // 2026年2月は1日が日曜、28日 → ちょうど4週でも42マスに埋める
    expect(getDays(2026, 1)).toHaveLength(42)
  })

  it('月初の曜日まで前月の日で埋める', () => {
    // 2026-08-01 は土曜 → 先頭6マスは 7/26〜7/31
    const days = getDays(2026, 7)

    expect(days.slice(0, 6)).toEqual([
      { day: 26, isCurrentMonth: false },
      { day: 27, isCurrentMonth: false },
      { day: 28, isCurrentMonth: false },
      { day: 29, isCurrentMonth: false },
      { day: 30, isCurrentMonth: false },
      { day: 31, isCurrentMonth: false },
    ])
    expect(days[6]).toEqual({ day: 1, isCurrentMonth: true })
  })

  it('月初が日曜なら前月分の埋めは無い', () => {
    // 2026-02-01 は日曜
    expect(getDays(2026, 1)[0]).toEqual({ day: 1, isCurrentMonth: true })
  })

  it('当月の日数ぶんだけ isCurrentMonth が立つ(うるう年も正しい)', () => {
    const countCurrent = (year: number, month: number) =>
      getDays(year, month).filter((day) => day.isCurrentMonth).length

    expect(countCurrent(2026, 7)).toBe(31)
    expect(countCurrent(2026, 1)).toBe(28)
    expect(countCurrent(2028, 1)).toBe(29)
  })

  it('末尾は翌月の1日から連番で埋まる', () => {
    const days = getDays(2026, 7)
    const trailing = days.slice(6 + 31)

    expect(trailing[0]).toEqual({ day: 1, isCurrentMonth: false })
    expect(trailing.map((day) => day.day)).toEqual(
      trailing.map((_, index) => index + 1),
    )
  })
})

describe('getCalendarDayDate', () => {
  const august2026: CalendarMonth = { year: 2026, month: 7 }
  const days = getDays(august2026.year, august2026.month)

  it('当月のマスは当月の日付になる', () => {
    // index 6 = 8/1
    expect(formatDateValue(getCalendarDayDate(days[6], august2026, 6))).toBe(
      '2026-08-01',
    )
  })

  it('先頭7マス内の月外日は前月として解決する', () => {
    expect(formatDateValue(getCalendarDayDate(days[0], august2026, 0))).toBe(
      '2026-07-26',
    )
  })

  it('8マス目以降の月外日は翌月として解決する', () => {
    const lastIndex = days.length - 1
    expect(
      formatDateValue(getCalendarDayDate(days[lastIndex], august2026, lastIndex)),
    ).toBe('2026-09-05')
  })
})
