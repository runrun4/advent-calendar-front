import { useMemo, useRef, useState } from 'react'

const MONTH_RANGE = 60

const WEEKDAYS = [
  'SUN',
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
]

type CalendarMonth = {
  year: number
  month: number
}

function createMonthList(): CalendarMonth[] {
  const today = new Date()

  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()

  return Array.from(
    { length: MONTH_RANGE * 2 + 1 },
    (_, index) => {
      const offset = index - MONTH_RANGE

      const date = new Date(
        currentYear,
        currentMonth + offset,
        1,
      )

      return {
        year: date.getFullYear(),
        month: date.getMonth(),
      }
    },
  )
}

function formatMonth(year: number, month: number) {
  return `${year}年${month + 1}月`
}

function formatShortMonth(
  year: number,
  month: number,
) {
  return `${month + 1}月`
}

function getDays(
  year: number,
  month: number,
): Array<number | null> {
  // その月の1日が何曜日か
  // 0 = SUN
  // 1 = MON
  // ...
  // 6 = SAT
  const firstDay = new Date(
    year,
    month,
    1,
  ).getDay()

  // その月の日数
  const daysInMonth = new Date(
    year,
    month + 1,
    0,
  ).getDate()

  const days: Array<number | null> = []

  // 月初までの空白
  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }

  // 日付
  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {
    days.push(day)
  }

  return days
}

export function PrivateCalendarPage() {
  /*
   * カレンダーに使用する月一覧
   *
   * 現在月を中心に
   * 前60か月 + 現在月 + 後60か月
   */
  const months = useMemo(
    () => createMonthList(),
    [],
  )

  /*
   * 今日の日付
   */
  const today = useMemo(() => {
    const date = new Date()

    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
    }
  }, [])

  /*
   * 現在月のインデックス
   */
  const currentMonthIndex = MONTH_RANGE

  const [monthIndex, setMonthIndex] =
    useState(currentMonthIndex)

  /*
   * スワイプ開始位置
   */
  const touchStartY =
    useRef<number | null>(null)

  /*
   * 現在表示している月
   */
  const currentMonth = months[monthIndex]

  /*
   * 前の月
   */
  const previousMonth =
    monthIndex > 0
      ? months[monthIndex - 1]
      : null

  /*
   * 次の月
   */
  const nextMonth =
    monthIndex < months.length - 1
      ? months[monthIndex + 1]
      : null

  /*
   * 現在の月の日付
   */
  const days = getDays(
    currentMonth.year,
    currentMonth.month,
  )

  /*
   * 前の月へ移動
   */
  const goToPreviousMonth = () => {
    if (monthIndex <= 0) {
      return
    }

    setMonthIndex((index) => index - 1)
  }

  /*
   * 次の月へ移動
   */
  const goToNextMonth = () => {
    if (monthIndex >= months.length - 1) {
      return
    }

    setMonthIndex((index) => index + 1)
  }

  /*
   * 指を置いた位置
   */
  const handleTouchStart = (
    event: React.TouchEvent<HTMLDivElement>,
  ) => {
    touchStartY.current =
      event.touches[0].clientY
  }

  /*
   * 指を離した位置
   */
  const handleTouchEnd = (
    event: React.TouchEvent<HTMLDivElement>,
  ) => {
    if (touchStartY.current === null) {
      return
    }

    const touchEndY =
      event.changedTouches[0].clientY

    const difference =
      touchStartY.current - touchEndY

    const SWIPE_THRESHOLD = 50

    // 上方向へスワイプ
    if (difference > SWIPE_THRESHOLD) {
      goToNextMonth()
    }

    // 下方向へスワイプ
    if (difference < -SWIPE_THRESHOLD) {
      goToPreviousMonth()
    }

    touchStartY.current = null
  }

  return (
    <div className="private-calendar-page">

      {/* =================================
          カレンダー領域
      ================================= */}

      <div className="private-calendar-page-calendar-area">

        <div className="private-calendar-page-calendar">

          {/* -------------------------
              ヘッダー
          -------------------------- */}

          <header className="private-calendar-page-header">

            {/* 現在の月 */}

            <div className="private-calendar-page-header-current">
              {formatMonth(
                currentMonth.year,
                currentMonth.month,
              )}
            </div>

            {/* 前後の月 */}

            <div className="private-calendar-page-header-navigation">

              {/* 次の月 */}

              <button
                type="button"
                className="private-calendar-page-header-navigation-button"
                onClick={goToNextMonth}
                disabled={nextMonth === null}
                aria-label="次の月"
              >
                <span className="private-calendar-page-header-navigation-arrow">
                  ↑
                </span>

                <span>
                  {nextMonth
                    ? formatShortMonth(
                        nextMonth.year,
                        nextMonth.month,
                      )
                    : ''}
                </span>
              </button>

              {/* 前の月 */}

              <button
                type="button"
                className="private-calendar-page-header-navigation-button"
                onClick={goToPreviousMonth}
                disabled={previousMonth === null}
                aria-label="前の月"
              >
                <span className="private-calendar-page-header-navigation-arrow">
                  ↓
                </span>

                <span>
                  {previousMonth
                    ? formatShortMonth(
                        previousMonth.year,
                        previousMonth.month,
                      )
                    : ''}
                </span>
              </button>

            </div>
          </header>

          {/* -------------------------
              曜日
          -------------------------- */}

          <div className="private-calendar-weekdays">
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className="private-calendar-weekday"
              >
                {weekday}
              </div>
            ))}
          </div>

          {/* -------------------------
              日付
          -------------------------- */}

          <div
            className="private-calendar-days"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {days.map((day, index) => {
              const isToday =
                day !== null &&
                currentMonth.year === today.year &&
                currentMonth.month === today.month &&
                day === today.day

              return (
                <button
                  key={index}
                  type="button"
                  className={`private-calendar-day${
                    isToday
                      ? ' is-today'
                      : ''
                  }`}
                  disabled={day === null}
                >
                  {day}
                </button>
              )
            })}
          </div>

        </div>
      </div>

      {/* =================================
          ＋ボタン領域
      ================================= */}

      <div className="private-calendar-page-addbutton-area">
        <button
          type="button"
          className="private-calendar-page-addbutton-button"
          aria-label="予定を追加"
        >
          +
        </button>
      </div>

      {/* =================================
          下部領域
      ================================= */}

      <div className="private-calendar-page-bottom" />

    </div>
  )
}