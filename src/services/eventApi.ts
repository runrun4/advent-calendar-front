import { apiRequest } from './apiClient'

export type BoardOrientation = 'PORTRAIT' | 'LANDSCAPE'

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
  boardOrientation: BoardOrientation
  iconId: string
  boardEdited: boolean
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
    },
  })
}

export async function updateEventSettings(
  eventId: string,
  input: {
    boardOrientation?: BoardOrientation
    name?: string
    iconId?: string
    clearBoard?: boolean
  },
): Promise<EventSummary> {
  return apiRequest<EventSummary>(`/v1/events/${eventId}`, {
    method: 'PATCH',
    body: input,
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

export async function leaveEvent(eventId: string): Promise<void> {
  await apiRequest<void>(`/v1/events/${eventId}/leave`, {
    method: 'POST',
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

export type StickerItem = {
  id: string
  name: string
  imageUrl: string
  rarity: string
  flavorText: string
  source: string
}

export type CollectedSticker = {
  grantId: string
  grantedAt: string
  source: string
  dayId: string | null
  sticker: StickerItem
}

export type EventCollections = {
  eventId: string
  knowledgeCards: unknown[]
  stickers: CollectedSticker[]
}

export async function getEventCollections(
  eventId: string,
  signal?: AbortSignal,
): Promise<EventCollections> {
  return apiRequest<EventCollections>(`/v1/events/${eventId}/collections`, {
    signal,
  })
}
