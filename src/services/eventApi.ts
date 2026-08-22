import { apiRequest } from './apiClient'

export type EventSummary = {
  id: string
  name: string
  startDate: string
  endDate: string
  timezone: string
  mode: string
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELED' | string
  role: string
  daysRemaining: number
  coverImageUrl: string | null
}

type ListEventsResponse = {
  events: EventSummary[]
}

export async function listEvents(signal?: AbortSignal): Promise<EventSummary[]> {
  const data = await apiRequest<ListEventsResponse>('/v1/events', { signal })
  return data.events ?? []
}
