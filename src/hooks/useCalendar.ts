import { useState } from 'react'
import type { CalendarEvent } from '../types/calendar'

export function useCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  return {
    events,
    setEvents,
    selectedDate,
    setSelectedDate,
  }
}
