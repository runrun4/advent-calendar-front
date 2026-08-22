import {
  MONTH_NAMES,
  MONTH_RANGE,
  type CalendarDay,
  type CalendarMonth,
} from './calendarTypes'

export function formatDateValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getCalendarDayDate(
  calendarDay: CalendarDay,
  currentMonth: CalendarMonth,
  index: number,
): Date {
  if (calendarDay.isCurrentMonth) {
    return new Date(
      currentMonth.year,
      currentMonth.month,
      calendarDay.day,
    )
  }

  // 先頭7マス内の月外日は前月、それ以外は翌月。
  const monthOffset = index < 7 ? -1 : 1
  return new Date(
    currentMonth.year,
    currentMonth.month + monthOffset,
    calendarDay.day,
  )
}

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

export function getDays(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()
  const days: CalendarDay[] = []

  for (let i = 0; i < firstDay; i++) {
    days.push({
      day: prevMonthDays - firstDay + 1 + i,
      isCurrentMonth: false,
    })
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
