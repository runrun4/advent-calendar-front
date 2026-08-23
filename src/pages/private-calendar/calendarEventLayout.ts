import type { EventSummary } from '../../services/eventApi'
import type { CalendarDay, CalendarMonth } from './calendarTypes'
import { formatDateValue, getCalendarDayDate } from './calendarUtils'

export type CalendarEventBar = {
  key: string
  eventId: string
  name: string
  /** 週内の開始列 (0=日〜6=土) */
  startCol: number
  /** 連続する日数 (1〜7) */
  span: number
  /** 重なり回避用の段 */
  lane: number
}

const MAX_LANES = 3

function compareDate(a: string, b: string): number {
  return a.localeCompare(b)
}

function minDate(a: string, b: string): string {
  return compareDate(a, b) <= 0 ? a : b
}

function maxDate(a: string, b: string): string {
  return compareDate(a, b) >= 0 ? a : b
}

function dayDiff(start: string, end: string): number {
  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)
  const startMs = Date.UTC(sy, sm - 1, sd)
  const endMs = Date.UTC(ey, em - 1, ed)
  return Math.round((endMs - startMs) / 86_400_000)
}

/** キャンセル以外を対象にし、開始日順に並べる。 */
export function visibleCalendarEvents(events: EventSummary[]): EventSummary[] {
  return events
    .filter((event) => event.status !== 'CANCELED')
    .slice()
    .sort((a, b) => {
      const byStart = compareDate(a.startDate, b.startDate)
      if (byStart !== 0) return byStart
      const byEnd = compareDate(a.endDate, b.endDate)
      if (byEnd !== 0) return byEnd
      return a.id.localeCompare(b.id)
    })
}

/**
 * 表示中の42マスを週ごとに分割し、各週でイベントを横長バーの区間に落とす。
 * 複数日は同一週内で連結し、週をまたぐ場合は次週に継続する。
 */
export function layoutEventBarsForMonth(
  days: CalendarDay[],
  currentMonth: CalendarMonth,
  events: EventSummary[],
): CalendarEventBar[][] {
  const visible = visibleCalendarEvents(events)
  const weekBars: CalendarEventBar[][] = Array.from({ length: 6 }, () => [])

  for (let week = 0; week < 6; week += 1) {
    const weekStartIndex = week * 7
    const weekDates = Array.from({ length: 7 }, (_, col) => {
      const index = weekStartIndex + col
      return formatDateValue(
        getCalendarDayDate(days[index], currentMonth, index),
      )
    })
    const weekStart = weekDates[0]
    const weekEnd = weekDates[6]

    type RawSegment = {
      eventId: string
      name: string
      startCol: number
      endCol: number
    }

    const segments: RawSegment[] = []

    for (const event of visible) {
      const start = maxDate(event.startDate, weekStart)
      const end = minDate(event.endDate, weekEnd)
      if (compareDate(start, end) > 0) continue

      const startCol = dayDiff(weekStart, start)
      const endCol = dayDiff(weekStart, end)
      if (startCol < 0 || endCol > 6) continue

      segments.push({
        eventId: event.id,
        name: event.name,
        startCol,
        endCol,
      })
    }

    // 開始列 → 長い順でレーン詰め
    segments.sort((a, b) => {
      if (a.startCol !== b.startCol) return a.startCol - b.startCol
      const aSpan = a.endCol - a.startCol
      const bSpan = b.endCol - b.startCol
      if (aSpan !== bSpan) return bSpan - aSpan
      return a.eventId.localeCompare(b.eventId)
    })

    const laneEnds: number[] = []

    for (const segment of segments) {
      let lane = laneEnds.findIndex((endCol) => endCol < segment.startCol)
      if (lane === -1) {
        if (laneEnds.length >= MAX_LANES) continue
        lane = laneEnds.length
        laneEnds.push(segment.endCol)
      } else {
        laneEnds[lane] = segment.endCol
      }

      weekBars[week].push({
        key: `${segment.eventId}-w${week}-c${segment.startCol}`,
        eventId: segment.eventId,
        name: segment.name,
        startCol: segment.startCol,
        span: segment.endCol - segment.startCol + 1,
        lane,
      })
    }
  }

  return weekBars
}
