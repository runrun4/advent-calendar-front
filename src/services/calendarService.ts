import type { AdventDay, CalendarEvent } from '../types/calendar'

export async function fetchPrivateEvents(): Promise<CalendarEvent[]> {
  return []
}

export async function fetchEventById(_id: string): Promise<CalendarEvent | null> {
  return null
}

export async function fetchAdventDays(_eventId: string): Promise<AdventDay[]> {
  return []
}
