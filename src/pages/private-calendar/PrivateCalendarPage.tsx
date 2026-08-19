import { useMemo, useRef, useState, type TouchEvent } from 'react'
import { CalendarAddButton } from './CalendarAddButton'
import { CalendarDays } from './CalendarDays'
import { CalendarHeader } from './CalendarHeader'
import { CalendarWeekdays } from './CalendarWeekdays'
import { MONTH_RANGE } from './calendarTypes'
import { createMonthList, getDays } from './calendarUtils'

const SWIPE_THRESHOLD = 50

export function PrivateCalendarPage() {
  const months = useMemo(() => createMonthList(), [])
  const today = useMemo(() => {
    const date = new Date()
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
    }
  }, [])

  const [monthIndex, setMonthIndex] = useState(MONTH_RANGE)
  const touchStartY = useRef<number | null>(null)

  const currentMonth = months[monthIndex]
  const previousMonth = monthIndex > 0 ? months[monthIndex - 1] : null
  const nextMonth =
    monthIndex < months.length - 1 ? months[monthIndex + 1] : null
  const days = getDays(currentMonth.year, currentMonth.month)

  const goToPreviousMonth = () => {
    if (monthIndex <= 0) return
    setMonthIndex((index) => index - 1)
  }

  const goToNextMonth = () => {
    if (monthIndex >= months.length - 1) return
    setMonthIndex((index) => index + 1)
  }

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartY.current = event.touches[0].clientY
  }

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartY.current === null) return

    const touchEndY = event.changedTouches[0].clientY

    if (touchEndY < touchStartY.current - SWIPE_THRESHOLD) {
      goToNextMonth()
    }

    if (touchEndY > touchStartY.current + SWIPE_THRESHOLD) {
      goToPreviousMonth()
    }

    touchStartY.current = null
  }

  return (
    <div className="private-calendar-page">
      <div className="private-calendar-page-calendar-area">
        <div className="private-calendar-page-calendar">
          <CalendarHeader
            currentMonth={currentMonth}
            previousMonth={previousMonth}
            nextMonth={nextMonth}
            onPreviousMonth={goToPreviousMonth}
            onNextMonth={goToNextMonth}
          />
          <CalendarWeekdays />
          <CalendarDays
            days={days}
            currentMonth={currentMonth}
            today={today}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
        </div>
      </div>

      <CalendarAddButton />
      <div className="private-calendar-page-bottom" />
    </div>
  )
}
