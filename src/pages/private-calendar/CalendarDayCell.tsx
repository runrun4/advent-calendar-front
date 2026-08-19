import type { CalendarDay, CalendarMonth, CalendarToday } from './calendarTypes'

type CalendarDayCellProps = {
  calendarDay: CalendarDay
  index: number
  currentMonth: CalendarMonth
  today: CalendarToday
}

function getDayCellClassName(
  calendarDay: CalendarDay,
  index: number,
  currentMonth: CalendarMonth,
  today: CalendarToday,
) {
  const weekdayIndex = index % 7
  const isSunday = weekdayIndex === 0
  const isSaturday = weekdayIndex === 6
  const isToday =
    calendarDay.isCurrentMonth &&
    currentMonth.year === today.year &&
    currentMonth.month === today.month &&
    calendarDay.day === today.day

  return [
    'private-calendar-day-cell',
    isToday ? 'is-today' : '',
    calendarDay.isCurrentMonth ? '' : 'is-outside-month',
    isSunday ? 'is-sunday' : '',
    isSaturday ? 'is-saturday' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

export function CalendarDayCell({
  calendarDay,
  index,
  currentMonth,
  today,
}: CalendarDayCellProps) {
  return (
    <div
      className={getDayCellClassName(
        calendarDay,
        index,
        currentMonth,
        today,
      )}
    >
      <div className="private-calendar-day-number">{calendarDay.day}</div>
      <div className="private-calendar-events" />
    </div>
  )
}
