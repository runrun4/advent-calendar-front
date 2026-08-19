import type { TouchEvent } from 'react'
import type { CalendarDay, CalendarMonth, CalendarToday } from './calendarTypes'
import { CalendarDayCell } from './CalendarDayCell'

type CalendarDaysProps = {
  days: CalendarDay[]
  currentMonth: CalendarMonth
  today: CalendarToday
  onTouchStart: (event: TouchEvent<HTMLDivElement>) => void
  onTouchEnd: (event: TouchEvent<HTMLDivElement>) => void
}

export function CalendarDays({
  days,
  currentMonth,
  today,
  onTouchStart,
  onTouchEnd,
}: CalendarDaysProps) {
  return (
    <div
      className="private-calendar-days"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {days.map((calendarDay, index) => (
        <CalendarDayCell
          key={`${currentMonth.year}-${currentMonth.month}-${index}`}
          calendarDay={calendarDay}
          index={index}
          currentMonth={currentMonth}
          today={today}
        />
      ))}
    </div>
  )
}
