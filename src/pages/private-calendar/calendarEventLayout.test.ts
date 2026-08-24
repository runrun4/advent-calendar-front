import { describe, expect, it } from 'vitest'
import type { EventSummary } from '../../services/eventApi'
import {
  layoutEventBarsForMonth,
  visibleCalendarEvents,
} from './calendarEventLayout'
import { getDays } from './calendarUtils'
import type { CalendarMonth } from './calendarTypes'

/**
 * 2026年8月。1日(土)始まりなので 42マスの並びは
 * week0: 7/26(日)〜8/1(土) / week1: 8/2〜8/8 / week2: 8/9〜8/15 …
 * となり、週またぎの検証がしやすい。
 */
const AUGUST_2026: CalendarMonth = { year: 2026, month: 7 }
const AUGUST_2026_DAYS = getDays(AUGUST_2026.year, AUGUST_2026.month)

function makeEvent(
  id: string,
  startDate: string,
  endDate: string,
  overrides: Partial<EventSummary> = {},
): EventSummary {
  return {
    id,
    name: `event-${id}`,
    startDate,
    endDate,
    timezone: 'Asia/Tokyo',
    mode: 'GROUP',
    status: 'ACTIVE',
    role: 'OWNER',
    daysRemaining: 0,
    coverImageUrl: null,
    boardOrientation: 'PORTRAIT',
    iconId: 'icon-1',
    boardEdited: false,
    ...overrides,
  }
}

function layout(events: EventSummary[]) {
  return layoutEventBarsForMonth(AUGUST_2026_DAYS, AUGUST_2026, events)
}

describe('visibleCalendarEvents', () => {
  it('キャンセル済みイベントを除外する', () => {
    const result = visibleCalendarEvents([
      makeEvent('a', '2026-08-10', '2026-08-10'),
      makeEvent('b', '2026-08-11', '2026-08-11', { status: 'CANCELED' }),
      makeEvent('c', '2026-08-12', '2026-08-12', { status: 'COMPLETED' }),
    ])

    expect(result.map((event) => event.id)).toEqual(['a', 'c'])
  })

  it('開始日 → 終了日 → id の順に並べ替える', () => {
    const result = visibleCalendarEvents([
      makeEvent('z', '2026-08-10', '2026-08-10'),
      makeEvent('a', '2026-08-10', '2026-08-10'),
      makeEvent('b', '2026-08-10', '2026-08-12'),
      makeEvent('c', '2026-08-09', '2026-08-30'),
    ])

    expect(result.map((event) => event.id)).toEqual(['c', 'a', 'z', 'b'])
  })

  it('引数の配列を破壊しない', () => {
    const events = [
      makeEvent('z', '2026-08-11', '2026-08-11'),
      makeEvent('a', '2026-08-10', '2026-08-10'),
    ]
    visibleCalendarEvents(events)

    expect(events.map((event) => event.id)).toEqual(['z', 'a'])
  })
})

describe('layoutEventBarsForMonth', () => {
  it('常に6週分の配列を返す', () => {
    const weeks = layout([])

    expect(weeks).toHaveLength(6)
    expect(weeks.every((bars) => bars.length === 0)).toBe(true)
  })

  it('単日イベントは span=1 のバーになる', () => {
    // 8/10(月) は week2 の col1 (week2 は 8/9(日) 始まり)
    const weeks = layout([makeEvent('a', '2026-08-10', '2026-08-10')])

    expect(weeks[2]).toEqual([
      {
        key: 'a-w2-c1',
        eventId: 'a',
        name: 'event-a',
        startCol: 1,
        span: 1,
        lane: 0,
      },
    ])
    expect(weeks.filter((_, week) => week !== 2).flat()).toEqual([])
  })

  it('同一週内の複数日イベントは1本のバーに連結する', () => {
    const weeks = layout([makeEvent('a', '2026-08-10', '2026-08-12')])

    expect(weeks[2]).toHaveLength(1)
    expect(weeks[2][0]).toMatchObject({ startCol: 1, span: 3, lane: 0 })
  })

  it('週をまたぐイベントは週ごとに分割される', () => {
    // 8/7(金)〜8/10(月): week1 の col5〜col6 と week2 の col0〜col1
    const weeks = layout([makeEvent('a', '2026-08-07', '2026-08-10')])

    expect(weeks[1]).toHaveLength(1)
    expect(weeks[1][0]).toMatchObject({ startCol: 5, span: 2, key: 'a-w1-c5' })
    expect(weeks[2]).toHaveLength(1)
    expect(weeks[2][0]).toMatchObject({ startCol: 0, span: 2, key: 'a-w2-c0' })
  })

  it('表示中の月外の日(前月/翌月マス)にも掛かる', () => {
    // 7/27〜7/28 は week0 (7/26 日曜始まり) の col1〜col2
    const weeks = layout([makeEvent('a', '2026-07-27', '2026-07-28')])

    expect(weeks[0]).toHaveLength(1)
    expect(weeks[0][0]).toMatchObject({ startCol: 1, span: 2 })
  })

  it('42マスの範囲外のイベントはどの週にも現れない', () => {
    const weeks = layout([makeEvent('a', '2026-12-01', '2026-12-03')])

    expect(weeks.flat()).toEqual([])
  })

  it('重なるイベントは別レーンへ積む', () => {
    const weeks = layout([
      makeEvent('a', '2026-08-10', '2026-08-12'),
      makeEvent('b', '2026-08-11', '2026-08-13'),
    ])

    expect(weeks[2].map((bar) => ({ id: bar.eventId, lane: bar.lane }))).toEqual([
      { id: 'a', lane: 0 },
      { id: 'b', lane: 1 },
    ])
  })

  it('重ならないイベントは同じレーンを使い回す', () => {
    const weeks = layout([
      makeEvent('a', '2026-08-09', '2026-08-10'),
      makeEvent('b', '2026-08-12', '2026-08-13'),
    ])

    expect(weeks[2].every((bar) => bar.lane === 0)).toBe(true)
    expect(weeks[2]).toHaveLength(2)
  })

  it('レーン上限(3)を超えた分は表示しない', () => {
    const weeks = layout([
      makeEvent('a', '2026-08-10', '2026-08-12'),
      makeEvent('b', '2026-08-10', '2026-08-12'),
      makeEvent('c', '2026-08-10', '2026-08-12'),
      makeEvent('d', '2026-08-10', '2026-08-12'),
    ])

    expect(weeks[2]).toHaveLength(3)
    expect(weeks[2].map((bar) => bar.lane)).toEqual([0, 1, 2])
    expect(weeks[2].map((bar) => bar.eventId)).not.toContain('d')
  })

  it('キャンセル済みイベントはバーにならない', () => {
    const weeks = layout([
      makeEvent('a', '2026-08-10', '2026-08-10', { status: 'CANCELED' }),
    ])

    expect(weeks.flat()).toEqual([])
  })

  it('週内では key が一意になる', () => {
    const weeks = layout([
      makeEvent('a', '2026-08-10', '2026-08-12'),
      makeEvent('b', '2026-08-10', '2026-08-12'),
    ])
    const keys = weeks[2].map((bar) => bar.key)

    expect(new Set(keys).size).toBe(keys.length)
  })
})
