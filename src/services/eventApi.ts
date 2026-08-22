import { apiRequest, apiRequestWithStatus } from './apiClient'

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

/** GET /v1/events の要素に詳細フィールドを足したもの(openapi.yaml の EventDetail)。 */
export type EventDetail = EventSummary & {
  createdAt: string
  calendarStartDate: string
  visibleDayCount: number
  groupId?: string | null
}

export type AcceptInvitationResult = {
  event: EventDetail
  /** 201=今回参加 / 200=既に参加済み。 */
  alreadyJoined: boolean
}

/**
 * 招待トークンを承認してイベントへ参加する。
 *
 * 200(既に参加済み)と201(参加完了)で文言を変えるため、
 * ステータスまで見られる apiRequestWithStatus を使う。
 */
export async function acceptInvitation(
  token: string,
): Promise<AcceptInvitationResult> {
  const { data, status } = await apiRequestWithStatus<EventDetail>(
    `/v1/invitations/${encodeURIComponent(token)}/accept`,
    { method: 'POST' },
  )

  return { event: data, alreadyJoined: status === 200 }
}
