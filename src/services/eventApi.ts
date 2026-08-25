import {
  apiRequest,
  apiRequestValidated,
  apiRequestValidatedWithStatus,
} from './apiClient'
import { resolveStickerImageUrl } from './stickerUrl'
import {
  bestShotSchema,
  eventBestShotsSchema,
  eventCalendarSchema,
  eventCandidatesResponseSchema,
  eventCollectionsSchema,
  eventDetailSchema,
  eventMembersResponseSchema,
  invitationSchema,
  listEventsResponseSchema,
  openDayResponseSchema,
  openedDayResponseSchema,
  type BestShot,
  type BoardOrientation,
  type CalendarDayState,
  type CalendarDaySummary,
  type CollectedSticker,
  type CooperationProgress,
  type EventBestShots,
  type EventCalendar,
  type EventCollections,
  type EventDetail,
  type EventMember,
  type EventMemberUser,
  type EventMembersResponse,
  type EventNameCandidate,
  type EventSummary,
  type Invitation,
  type OpenDayResponse,
  type OpenedDayContent,
  type OpenedDayResponse,
  type StickerItem,
} from '../schemas/event'

// 型は schemas/event.ts の Zod スキーマから導出したものを再輸出する。
// 呼び出し側は従来どおり services/eventApi から import できる。
export type {
  BestShot,
  BoardOrientation,
  CalendarDayState,
  CalendarDaySummary,
  CollectedSticker,
  CooperationProgress,
  EventBestShots,
  EventCalendar,
  EventCollections,
  EventDetail,
  EventMember,
  EventMemberUser,
  EventMembersResponse,
  EventNameCandidate,
  EventSummary,
  Invitation,
  OpenDayResponse,
  OpenedDayContent,
  OpenedDayResponse,
  StickerItem,
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
  const data = await apiRequestValidated('/v1/events', listEventsResponseSchema, {
    signal,
  })
  return data.events
}

export type SearchEventCandidatesInput = {
  name: string
  startDate: string
  endDate: string
  location?: string
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

  const data = await apiRequestValidated(
    '/v1/event-candidates',
    eventCandidatesResponseSchema,
    {
      method: 'POST',
      body,
      signal,
    },
  )

  return data.candidates
}

/** 201 で EventDetail が返る（EventSummary のスーパーセット）。 */
export async function createEvent(
  input: CreateEventInput,
): Promise<EventDetail> {
  const countdownDays = Math.min(29, Math.max(0, input.countdownDays))

  return apiRequestValidated('/v1/events', eventDetailSchema, {
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
): Promise<EventDetail> {
  return apiRequestValidated(`/v1/events/${eventId}`, eventDetailSchema, {
    method: 'PATCH',
    body: input,
  })
}

export async function listEventMembers(
  eventId: string,
  signal?: AbortSignal,
): Promise<EventMembersResponse> {
  return apiRequestValidated(
    `/v1/events/${eventId}/members`,
    eventMembersResponseSchema,
    { signal },
  )
}

/** 204 を返すだけで本文が無いので、検証する対象がない。 */
export async function leaveEvent(eventId: string): Promise<void> {
  await apiRequest<void>(`/v1/events/${eventId}/leave`, {
    method: 'POST',
  })
}

export async function createInvitation(
  eventId: string,
  expiresInHours = 168,
): Promise<Invitation> {
  return apiRequestValidated(
    `/v1/events/${eventId}/invitations`,
    invitationSchema,
    {
      method: 'POST',
      body: { expiresInHours },
    },
  )
}

export async function getEventCollections(
  eventId: string,
  signal?: AbortSignal,
): Promise<EventCollections> {
  const collections = await apiRequestValidated(
    `/v1/events/${eventId}/collections`,
    eventCollectionsSchema,
    { signal },
  )

  return {
    ...collections,
    stickers: collections.stickers.map((item) => ({
      ...item,
      sticker: {
        ...item.sticker,
        imageUrl: resolveStickerImageUrl(item.sticker.imageUrl),
      },
    })),
  }
}

export async function getEventBestShots(
  eventId: string,
  signal?: AbortSignal,
): Promise<EventBestShots> {
  return apiRequestValidated(
    `/v1/events/${eventId}/best-shots`,
    eventBestShotsSchema,
    { signal },
  )
}

export async function putMyBestShot(
  eventId: string,
  imagePath: string,
): Promise<BestShot> {
  return apiRequestValidated(
    `/v1/events/${eventId}/best-shots/me`,
    bestShotSchema,
    {
      method: 'PUT',
      body: { imagePath },
    },
  )
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
 * ステータスまで見られる apiRequestValidatedWithStatus を使う。
 */
export async function acceptInvitation(
  token: string,
): Promise<AcceptInvitationResult> {
  const { data, status } = await apiRequestValidatedWithStatus(
    `/v1/invitations/${encodeURIComponent(token)}/accept`,
    eventDetailSchema,
    { method: 'POST' },
  )

  return { event: data, alreadyJoined: status === 200 }
}

/** GET /v1/events/{eventId}/calendar */
export async function getEventCalendar(
  eventId: string,
  signal?: AbortSignal,
): Promise<EventCalendar> {
  return apiRequestValidated(
    `/v1/events/${eventId}/calendar`,
    eventCalendarSchema,
    { signal },
  )
}

/** POST /v1/events/{eventId}/days/{dayId}/open */
export async function openEventDay(
  eventId: string,
  dayId: string,
): Promise<OpenDayResponse> {
  return apiRequestValidated(
    `/v1/events/${eventId}/days/${dayId}/open`,
    openDayResponseSchema,
    { method: 'POST' },
  )
}

/** GET /v1/events/{eventId}/days/{dayId} */
export async function getOpenedDay(
  eventId: string,
  dayId: string,
  signal?: AbortSignal,
): Promise<OpenedDayResponse> {
  return apiRequestValidated(
    `/v1/events/${eventId}/days/${dayId}`,
    openedDayResponseSchema,
    { signal },
  )
}
