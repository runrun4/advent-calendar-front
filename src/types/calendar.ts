export type CalendarEvent = {
  id: string
  title: string
  description: string | null
  startAt: string
  endAt: string
  isPrivate: boolean
}

export type AdventDay = {
  day: number
  isOpened: boolean
  content: string | null
}
