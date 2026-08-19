import {
  MONTH_NAMES,
  MONTH_RANGE,
  type CalendarDay,
  type CalendarMonth,
} from './calendarTypes'

export function createMonthList(): CalendarMonth[] {
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()

  return Array.from({ length: MONTH_RANGE * 2 + 1 }, (_, index) => {
    const date = new Date(currentYear, currentMonth + (index - MONTH_RANGE), 1)

    return {
      year: date.getFullYear(),
      month: date.getMonth(),
    }
  })
}

export function formatShortMonth(_year: number, month: number) {
  return `${month + 1}${MONTH_NAMES[month]}`
}

export function getDays(year: number, month: number): Array<CalendarDay | null> {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: Array<CalendarDay | null> = []

  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push({ day, isCurrentMonth: true })
  }

  let nextMonthDay = 1
  while (days.length < 42) {
    days.push({ day: nextMonthDay, isCurrentMonth: false })
    nextMonthDay++
  }

  return days
}
