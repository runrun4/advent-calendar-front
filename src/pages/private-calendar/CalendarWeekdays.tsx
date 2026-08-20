import { WEEKDAYS } from './calendarTypes'

export function CalendarWeekdays() {
  return (
    <div className="private-calendar-weekdays">
      {WEEKDAYS.map((weekday) => {
        const weekendClass =
          weekday === 'SUN'
            ? ' is-sunday'
            : weekday === 'SAT'
              ? ' is-saturday'
              : ''

        return (
          <div
            key={weekday}
            className={`private-calendar-weekday${weekendClass}`}
          >
            {weekday}
          </div>
        )
      })}
    </div>
  )
}
