import { MONTH_NAMES, type CalendarMonth } from './calendarTypes'
import { formatShortMonth } from './calendarUtils'

type CalendarHeaderProps = {
  currentMonth: CalendarMonth
  previousMonth: CalendarMonth | null
  nextMonth: CalendarMonth | null
  onPreviousMonth: () => void
  onNextMonth: () => void
}

export function CalendarHeader({
  currentMonth,
  previousMonth,
  nextMonth,
  onPreviousMonth,
  onNextMonth,
}: CalendarHeaderProps) {
  return (
    <header className="private-calendar-page-header">
      <div className="private-calendar-page-header-current">
        <span className="private-calendar-page-header-day">
          {currentMonth.month + 1}
        </span>
        <div className="private-calendar-page-header-month-info">
          <span className="private-calendar-page-header-year">
            {currentMonth.year}
          </span>
          <span className="private-calendar-page-header-month">
            {MONTH_NAMES[currentMonth.month]}
          </span>
        </div>
      </div>

      <div className="private-calendar-page-header-navigation">
        <button
          type="button"
          className="private-calendar-page-header-navigation-button"
          onClick={onPreviousMonth}
          disabled={previousMonth === null}
          aria-label="前の月"
        >
          <span>
            {previousMonth
              ? formatShortMonth(previousMonth.year, previousMonth.month)
              : ''}
          </span>
          <span className="private-calendar-page-header-navigation-arrow">
            ↑
          </span>
        </button>

        <button
          type="button"
          className="private-calendar-page-header-navigation-button"
          onClick={onNextMonth}
          disabled={nextMonth === null}
          aria-label="次の月"
        >
          <span>
            {nextMonth
              ? formatShortMonth(nextMonth.year, nextMonth.month)
              : ''}
          </span>
          <span className="private-calendar-page-header-navigation-arrow">
            ↓
          </span>
        </button>
      </div>
    </header>
  )
}
