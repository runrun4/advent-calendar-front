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
  iconId?: string
}

type ListEventsResponse = {
  events: EventSummary[]
}

export type CreateEventInput = {
  name: string
  startDate: string
  endDate: string
  timezone?: string
  countdownDays: number
  mode: 'GROUP' | 'PERSONAL'
  category?: string | null
  description?: string | null
  iconId?: string
}

export async function listEvents(signal?: AbortSignal): Promise<EventSummary[]> {
  const data = await apiRequest<ListEventsResponse>('/v1/events', { signal })
  return data.events ?? []
}

export type EventNameCandidate = {
  name: string
  sourceUrl: string | null
}

export type SearchEventCandidatesInput = {
  name: string
  startDate: string
  endDate: string
  location?: string
}

type EventCandidatesResponse = {
  candidates: EventNameCandidate[]
}

export async function searchEventCandidates(
  input: SearchEventCandidatesInput,
  signal?: AbortSignal,
): Promise<EventNameCandidate[]> {
  const body: Record<string, string> = {
    visibility: 'PUBLIC',
    name: input.name.trim(),
    startDate: input.startDate,
    endDate: input.endDate,
  }

  const location = input.location?.trim()
  if (location) {
    body.location = location
  }

  const data = await apiRequest<EventCandidatesResponse>(
    '/v1/event-candidates',
    {
      method: 'POST',
      body,
      signal,
    },
  )

  return data.candidates ?? []
}

export async function createEvent(
  input: CreateEventInput,
): Promise<EventSummary> {
  const countdownDays = Math.min(29, Math.max(0, input.countdownDays))

  return apiRequest<EventSummary>('/v1/events', {
    method: 'POST',
    body: {
      name: input.name.trim(),
      startDate: input.startDate,
      endDate: input.endDate,
      timezone: input.timezone ?? 'Asia/Tokyo',
      countdownDays,
      mode: input.mode,
      ...(input.category ? { category: input.category } : {}),
      ...(input.description ? { description: input.description } : {}),
      ...(input.iconId ? { iconId: input.iconId } : {}),
    },
  })
}

export type Invitation = {
  id: string
  eventId: string
  token: string
  expiresAt: string
  inviteUrl: string
}

export async function createInvitation(
  eventId: string,
  expiresInHours = 168,
): Promise<Invitation> {
  return apiRequest<Invitation>(`/v1/events/${eventId}/invitations`, {
    method: 'POST',
    body: { expiresInHours },
  })
}

export type EventMemberUser = {
  id: string
  displayName: string
  avatarUrl: string | null
}

export type EventMember = {
  user: EventMemberUser
  role: string
  joinedAt: string
  openedToday: boolean | null
}

type EventMembersResponse = {
  eventId: string
  members: EventMember[]
}

export async function listEventMembers(
  eventId: string,
  signal?: AbortSignal,
): Promise<EventMembersResponse> {
  return apiRequest<EventMembersResponse>(`/v1/events/${eventId}/members`, {
    signal,
  })
}
