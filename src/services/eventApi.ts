import { apiRequest, apiRequestWithStatus } from './apiClient'
import { resolveStickerImageUrl } from './stickerUrl'

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
  phase?: 'UPCOMING' | 'ONGOING' | 'ENDED' | string
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
  const collections = await apiRequest<EventCollections>(
    `/v1/events/${eventId}/collections`,
    { signal },
  )

  return {
    ...collections,
    stickers: (collections.stickers ?? []).map((item) => ({
      ...item,
      sticker: {
        ...item.sticker,
        imageUrl: resolveStickerImageUrl(item.sticker.imageUrl ?? ''),
      },
    })),
  }
}

export type BestShot = {
  id: string
  user: {
    id: string
    displayName: string
    avatarUrl: string | null
  }
  /** サーバーが返す保存パス。未デプロイ時は imageUrl から復元する。 */
  imagePath?: string
  imageUrl: string
  createdAt: string
  updatedAt: string
}

export type EventBestShots = {
  eventId: string
  shots: BestShot[]
}

export async function getEventBestShots(
  eventId: string,
  signal?: AbortSignal,
): Promise<EventBestShots> {
  return apiRequest<EventBestShots>(`/v1/events/${eventId}/best-shots`, {
    signal,
  })
}

export async function putMyBestShot(
  eventId: string,
  imagePath: string,
): Promise<BestShot> {
  return apiRequest<BestShot>(`/v1/events/${eventId}/best-shots/me`, {
    method: 'PUT',
    body: { imagePath },
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

/** GET /v1/events/{eventId}/calendar */
export type CalendarDayState = 'LOCKED' | 'AVAILABLE' | 'OPENED' | 'EXPIRED' | string

export type CalendarDaySummary = {
  id: string
  date: string
  position: number
  state: CalendarDayState
  contentKind: 'KNOWLEDGE' | 'STICKER' | null
  isCooperationDay: boolean
  openedAt: string | null
}

export type CooperationProgress = {
  status: 'NOT_APPLICABLE' | 'IN_PROGRESS' | 'ACHIEVED' | 'FAILED' | string
  openedCount: number
  requiredCount: number
  achievedAt: string | null
}

export type EventCalendar = {
  event: EventDetail
  serverNow: string
  today: string
  days: CalendarDaySummary[]
  todayCooperation: CooperationProgress | null
}

export async function getEventCalendar(
  eventId: string,
  signal?: AbortSignal,
): Promise<EventCalendar> {
  return apiRequest<EventCalendar>(`/v1/events/${eventId}/calendar`, { signal })
}

export type OpenedDayContent =
  | {
      kind: 'KNOWLEDGE'
      knowledgeId: string
      title: string
      body: string
      imageUrl?: string | null
      category?: string | null
    }
  | {
      kind: 'STICKER'
      sticker: {
        id: string
        name: string
        imageUrl: string
        rarity: string
        flavorText: string
      }
    }

export type OpenedDayResponse = {
  eventId: string
  dayId: string
  date: string
  content: OpenedDayContent
}

export type OpenDayResponse = OpenedDayResponse & {
  grant?: {
    id: string
    kind: string
    grantedAt: string
    source: string
  }
  cooperation: {
    progress: CooperationProgress
    newlyAchieved: boolean
  } | null
}

/** POST /v1/events/{eventId}/days/{dayId}/open */
export async function openEventDay(
  eventId: string,
  dayId: string,
): Promise<OpenDayResponse> {
  return apiRequest<OpenDayResponse>(
    `/v1/events/${eventId}/days/${dayId}/open`,
    { method: 'POST' },
  )
}

/** GET /v1/events/{eventId}/days/{dayId} */
export async function getOpenedDay(
  eventId: string,
  dayId: string,
  signal?: AbortSignal,
): Promise<OpenedDayResponse> {
  return apiRequest<OpenedDayResponse>(
    `/v1/events/${eventId}/days/${dayId}`,
    { signal },
  )
}

