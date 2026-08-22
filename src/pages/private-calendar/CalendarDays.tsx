import type { TouchEvent } from 'react'
import type { CalendarDay, CalendarMonth, CalendarToday } from './calendarTypes'
import { formatDateValue, getCalendarDayDate } from './calendarUtils'
import { CalendarDayCell } from './CalendarDayCell'

type CalendarDaysProps = {
  days: CalendarDay[]
  currentMonth: CalendarMonth
  today: CalendarToday
  onSelectDate: (date: string) => void
  onTouchStart: (event: TouchEvent<HTMLDivElement>) => void
  onTouchEnd: (event: TouchEvent<HTMLDivElement>) => void
}

export function CalendarDays({
  days,
  currentMonth,
  today,
  onSelectDate,
  onTouchStart,
  onTouchEnd,
}: CalendarDaysProps) {
  const todayValue = formatDateValue(
    new Date(today.year, today.month, today.day),
  )

  return (
    <div
      className="private-calendar-days"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {days.map((calendarDay, index) => {
        const date = getCalendarDayDate(calendarDay, currentMonth, index)
        const dateValue = formatDateValue(date)
        const dateLabel =
          `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`

        return (
          <CalendarDayCell
            key={`${currentMonth.year}-${currentMonth.month}-${index}`}
            calendarDay={calendarDay}
            index={index}
            currentMonth={currentMonth}
            today={today}
            dateLabel={dateLabel}
            disabled={dateValue < todayValue}
            onSelect={() => onSelectDate(dateValue)}
          />
        )
      })}
    </div>
  )
}
