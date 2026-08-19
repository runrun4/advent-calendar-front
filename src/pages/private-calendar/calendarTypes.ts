export const MONTH_RANGE = 60

export const WEEKDAYS = [
  'SUN',
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
] as const

export const MONTH_NAMES = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const

export type CalendarMonth = {
  year: number
  month: number
}

export type CalendarDay = {
  day: number
  isCurrentMonth: boolean
}

export type CalendarToday = {
  year: number
  month: number
  day: number
}
