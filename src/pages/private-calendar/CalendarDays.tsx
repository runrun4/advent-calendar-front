import type { TouchEvent } from 'react'
import type { EventSummary } from '../../services/eventApi'
import type { CalendarDay, CalendarMonth, CalendarToday } from './calendarTypes'
import { layoutEventBarsForMonth } from './calendarEventLayout'
import { formatDateValue, getCalendarDayDate } from './calendarUtils'
import { CalendarDayCell } from './CalendarDayCell'

type CalendarDaysProps = {
  days: CalendarDay[]
  currentMonth: CalendarMonth
  today: CalendarToday
  events: EventSummary[]
  onSelectDate: (date: string) => void
  onTouchStart: (event: TouchEvent<HTMLDivElement>) => void
  onTouchEnd: (event: TouchEvent<HTMLDivElement>) => void
}

const BAR_HEIGHT_REM = 1.05
const BAR_GAP_REM = 0.15

export function CalendarDays({
  days,
  currentMonth,
  today,
  events,
  onSelectDate,
  onTouchStart,
  onTouchEnd,
}: CalendarDaysProps) {
  const todayValue = formatDateValue(
    new Date(today.year, today.month, today.day),
  )
  const weekBars = layoutEventBarsForMonth(days, currentMonth, events)

  return (
    <div
      className="private-calendar-days"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {Array.from({ length: 6 }, (_, week) => {
        const weekStart = week * 7
        const bars = weekBars[week]

        return (
          <div key={`week-${week}`} className="private-calendar-week">
            {days.slice(weekStart, weekStart + 7).map((calendarDay, col) => {
              const index = weekStart + col
              const date = getCalendarDayDate(calendarDay, currentMonth, index)
              const dateValue = formatDateValue(date)
              const dateLabel = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`

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

            {bars.length > 0 ? (
              <div className="private-calendar-week-events" aria-hidden="true">
                {bars.map((bar) => (
                  <div
                    key={bar.key}
                    className="private-calendar-event-bar"
                    title={bar.name}
                    style={{
                      left: `calc(${(bar.startCol / 7) * 100}% + 2px)`,
                      width: `calc(${(bar.span / 7) * 100}% - 4px)`,
                      top: `calc(${bar.lane} * (${BAR_HEIGHT_REM}rem + ${BAR_GAP_REM}rem))`,
                      height: `${BAR_HEIGHT_REM}rem`,
                    }}
                  >
                    <span className="private-calendar-event-bar__label">
                      {bar.name}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
