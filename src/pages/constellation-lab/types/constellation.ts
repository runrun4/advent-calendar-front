// ==========================================
// 星座カレンダーの型定義
// ==========================================

/** 画面全体の進行フェーズ */
export type Phase = 'daily' | 'opening' | 'card' | 'finale'

/** 1星(1日)の開閉状態 */
export type DayState = 'locked' | 'openable' | 'opened'

/** 開封済みの日に紐づく内容 */
export type DayContent = {
  message: string
  itemName: string
}

/** 星座カレンダーの1日分のデータ */
export type ConstellationDay = {
  day: number
  state: DayState
  content: DayContent | null
}

// ==========================================
// 既存 AdventCalendar 互換
// ==========================================

/** 既存フロントの AdventDay 相当 (day / isOpened / content) */
export type AdventDay = {
  day: number
  isOpened: boolean
  content: DayContent | null
}

/**
 * AdventDay[] + openable日 から ConstellationDay[] への一方向変換。
 * 既存データ構造からの移行を想定する。
 */
export const fromAdventDays = (
  adventDays: AdventDay[],
  openableDay: number
): ConstellationDay[] =>
  adventDays.map(({ day, isOpened, content }) => ({
    day,
    state: isOpened
      ? 'opened'
      : day === openableDay
        ? 'openable'
        : 'locked',
    content: isOpened ? content : null,
  }))
