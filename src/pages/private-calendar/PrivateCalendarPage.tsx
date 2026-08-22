import { useMemo, useRef, useState, type TouchEvent } from 'react'
import { CalendarAddButton } from './CalendarAddButton'
import { CalendarDays } from './CalendarDays'
import { CalendarHeader } from './CalendarHeader'
import { CalendarWeekdays } from './CalendarWeekdays'
import { MONTH_RANGE } from './calendarTypes'
import { createMonthList, getDays } from './calendarUtils'

const SWIPE_THRESHOLD = 50

type PrivateCalendarPageProps = {
  onOpenEventAdd?: (startDate?: string) => void
}

export function PrivateCalendarPage({
  onOpenEventAdd,
}: PrivateCalendarPageProps) {
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
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const didSwipe = useRef(false)

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
    didSwipe.current = false
    touchStart.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    }
  }

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStart.current === null) return

    const deltaX = event.changedTouches[0].clientX - touchStart.current.x
    const deltaY = event.changedTouches[0].clientY - touchStart.current.y
    touchStart.current = null

    if (Math.abs(deltaY) <= Math.abs(deltaX)) return
    if (Math.abs(deltaY) < SWIPE_THRESHOLD) return

    didSwipe.current = true

    if (deltaY < 0) {
      goToNextMonth()
      return
    }

    goToPreviousMonth()
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
            onSelectDate={(date) => {
              if (!didSwipe.current) onOpenEventAdd?.(date)
              didSwipe.current = false
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
        </div>
      </div>

      <CalendarAddButton onClick={() => onOpenEventAdd?.()} />
    </div>
  )
}
