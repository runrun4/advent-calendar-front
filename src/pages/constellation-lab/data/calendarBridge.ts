// ==========================================
// 本体イベント画面向け: カレンダー API ↔ 星座 UI の橋渡し
// ==========================================
import type {
  CalendarDaySummary,
  EventCalendar,
  EventDetail,
  OpenedDayContent,
} from '../../../services/eventApi'
import { TOTAL_DAYS, dayStateOf } from './constellationLayout'
import type { DayContent, DayState } from '../types/constellation'

export function dayContentFromApi(content: OpenedDayContent): DayContent {
  if (content.kind === 'KNOWLEDGE') {
    return {
      message: content.body,
      itemName: content.title,
    }
  }
  return {
    message: content.sticker.flavorText || content.sticker.name,
    itemName: content.sticker.name,
  }
}

/** イベントの表示日数（星の数）。座標は最大 TOTAL_DAYS まで */
export function resolveTotalDays(
  days: CalendarDaySummary[],
  event?: Pick<EventDetail, 'visibleDayCount'> | null,
): number {
  const fromDays = days.length
  const fromEvent = event?.visibleDayCount ?? fromDays
  const raw = fromDays > 0 ? fromDays : fromEvent
  return Math.min(TOTAL_DAYS, Math.max(1, raw))
}

/**
 * バックエンドの DayState を星座 UI の状態へ写す。
 * OPENED → opened / AVAILABLE → openable / それ以外 → locked
 * （EXPIRED の未開封は locked。見た目上「開いたこと」にはしない）
 */
export function buildDayStatesFromCalendar(
  days: CalendarDaySummary[],
  totalDays: number,
): Record<number, DayState> {
  const states: Record<number, DayState> = {}
  for (let day = 1; day <= totalDays; day += 1) {
    states[day] = 'locked'
  }
  for (const day of days) {
    if (day.position < 1 || day.position > totalDays) continue
    if (day.state === 'OPENED') {
      states[day.position] = 'opened'
    } else if (day.state === 'AVAILABLE') {
      states[day.position] = 'openable'
    }
  }
  return states
}

/** プロト／Debug 用: 連続開封モデルから状態マップを作る */
export function buildDayStatesFromOpenedCount(
  openedCount: number,
  totalDays: number = TOTAL_DAYS,
): Record<number, DayState> {
  const states: Record<number, DayState> = {}
  for (let day = 1; day <= totalDays; day += 1) {
    states[day] = dayStateOf(day, openedCount)
  }
  return states
}

export function countOpened(states: Record<number, DayState>): number {
  return Object.values(states).filter((state) => state === 'opened').length
}

/**
 * スワイプで辿れる最大日。全体像は出さないが、locked（将来／未開封）も
 * 画面遷移でスタブとして見られるように全日数まで許可する。
 */
export function maxAccessibleDayOf(
  _states: Record<number, DayState>,
  totalDays: number,
): number {
  return Math.max(1, totalDays)
}

export function focusDayFromStates(
  states: Record<number, DayState>,
  totalDays: number,
): number {
  for (let day = 1; day <= totalDays; day += 1) {
    if (states[day] === 'openable') return day
  }
  for (let day = totalDays; day >= 1; day -= 1) {
    if (states[day] === 'opened') return day
  }
  return 1
}

export function coopDaysFromCalendar(days: CalendarDaySummary[]): number[] {
  return days.filter((day) => day.isCooperationDay).map((day) => day.position)
}

export function dayIdByPosition(
  days: CalendarDaySummary[],
  position: number,
): string | null {
  return days.find((day) => day.position === position)?.id ?? null
}

export function hydrateCoopFromCalendar(calendar: EventCalendar): {
  myWritten: boolean
  othersWritten: number
  coopUnlocked: boolean
  memberTotal: number
} | null {
  const progress = calendar.todayCooperation
  if (!progress || progress.requiredCount <= 0) return null

  const todayCoopDay = calendar.days.find(
    (day) => day.isCooperationDay && day.date === calendar.today,
  )
  const myWritten = todayCoopDay?.state === 'OPENED'
  const othersWritten = Math.max(
    0,
    progress.openedCount - (myWritten ? 1 : 0),
  )
  const coopUnlocked =
    progress.status === 'ACHIEVED' || progress.achievedAt != null

  return {
    myWritten,
    othersWritten,
    coopUnlocked,
    memberTotal: progress.requiredCount,
  }
}

/** 開封成功後にローカル状態を更新する */
export function markDayOpened(
  states: Record<number, DayState>,
  day: number,
): Record<number, DayState> {
  return {
    ...states,
    [day]: 'opened',
  }
}
