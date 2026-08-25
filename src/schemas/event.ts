import { z } from 'zod'
import { nullableArray, userSchema } from './common'

/**
 * イベント系エンドポイントのレスポンススキーマ。
 *
 * 正本は runrun-backend の `docs/api/openapi.yaml`。ここには「画面が実際に読む
 * フィールド」だけを写している（z.object は未知のキーを落とすので、契約に増えても
 * 画面が使うまでは書かなくてよい）。
 *
 * enum のうち、既存の型が `'A' | 'B' | string` と将来値を許していたものは
 * `z.string()` のままにしてある。サーバーが値を増やしても画面が落ちないようにするため。
 */

export const boardOrientationSchema = z.enum(['PORTRAIT', 'LANDSCAPE'])
export type BoardOrientation = z.infer<typeof boardOrientationSchema>

export const eventSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  timezone: z.string(),
  /** GROUP | PERSONAL */
  mode: z.string(),
  /** ACTIVE | COMPLETED | CANCELED */
  status: z.string(),
  /** OWNER | MEMBER */
  role: z.string(),
  daysRemaining: z.number(),
  /** UPCOMING | ONGOING | ENDED */
  phase: z.string().optional(),
  // openapi の required に含まれないので、欠けていれば null として扱う。
  coverImageUrl: z.string().nullable().default(null),
  boardOrientation: boardOrientationSchema,
  iconId: z.string(),
  boardEdited: z.boolean(),
})
export type EventSummary = z.infer<typeof eventSummarySchema>

export const eventDetailSchema = eventSummarySchema.extend({
  createdAt: z.string(),
  calendarStartDate: z.string(),
  visibleDayCount: z.number(),
  groupId: z.string().nullish(),
})
export type EventDetail = z.infer<typeof eventDetailSchema>

export const listEventsResponseSchema = z.object({
  events: nullableArray(eventSummarySchema),
})

export const eventNameCandidateSchema = z.object({
  name: z.string(),
  sourceUrl: z.string().nullable().default(null),
})
export type EventNameCandidate = z.infer<typeof eventNameCandidateSchema>

export const eventCandidatesResponseSchema = z.object({
  candidates: nullableArray(eventNameCandidateSchema),
})

export type EventMemberUser = z.infer<typeof userSchema>

export const eventMemberSchema = z.object({
  user: userSchema,
  /** OWNER | MEMBER */
  role: z.string(),
  joinedAt: z.string(),
  openedToday: z.boolean().nullable().default(null),
})
export type EventMember = z.infer<typeof eventMemberSchema>

export const cooperationProgressSchema = z.object({
  /** NOT_APPLICABLE | IN_PROGRESS | ACHIEVED | FAILED */
  status: z.string(),
  openedCount: z.number(),
  requiredCount: z.number(),
  achievedAt: z.string().nullable().default(null),
})
export type CooperationProgress = z.infer<typeof cooperationProgressSchema>

export const eventMembersResponseSchema = z.object({
  eventId: z.string(),
  members: z.array(eventMemberSchema),
  todayCooperation: cooperationProgressSchema.nullable().default(null),
})
export type EventMembersResponse = z.infer<typeof eventMembersResponseSchema>

export const invitationSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  token: z.string(),
  expiresAt: z.string(),
  inviteUrl: z.string(),
})
export type Invitation = z.infer<typeof invitationSchema>

export const stickerItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string(),
  /** NORMAL | RARE | DELUXE */
  rarity: z.string(),
  flavorText: z.string(),
  /** DAILY | COOPERATION | EVENT_DAY */
  source: z.string(),
  eventName: z.string().nullish(),
  eventDate: z.string().nullish(),
})
export type StickerItem = z.infer<typeof stickerItemSchema>

export const collectedStickerSchema = z.object({
  grantId: z.string(),
  grantedAt: z.string(),
  /** DAILY_OPENING | COOPERATION | EVENT_DAY */
  source: z.string(),
  dayId: z.string().nullable().default(null),
  sticker: stickerItemSchema,
})
export type CollectedSticker = z.infer<typeof collectedStickerSchema>

export const eventCollectionsSchema = z.object({
  eventId: z.string(),
  // ナレッジカードは画面が未実装。中身は見ないので形も決めない。
  knowledgeCards: z.array(z.unknown()),
  stickers: nullableArray(collectedStickerSchema),
})
export type EventCollections = z.infer<typeof eventCollectionsSchema>

export const bestShotSchema = z.object({
  id: z.string(),
  user: userSchema,
  /** サーバーが返す保存パス。未デプロイ時は imageUrl から復元する。 */
  imagePath: z.string().optional(),
  imageUrl: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type BestShot = z.infer<typeof bestShotSchema>

export const eventBestShotsSchema = z.object({
  eventId: z.string(),
  shots: z.array(bestShotSchema),
})
export type EventBestShots = z.infer<typeof eventBestShotsSchema>

/** LOCKED | AVAILABLE | OPENED | EXPIRED（将来値も受ける） */
export type CalendarDayState = 'LOCKED' | 'AVAILABLE' | 'OPENED' | 'EXPIRED' | string

export const calendarDaySummarySchema = z.object({
  id: z.string(),
  date: z.string(),
  position: z.number(),
  state: z.string(),
  contentKind: z.enum(['KNOWLEDGE', 'STICKER']).nullable().default(null),
  // 契約上は null を許す（未来日の公開方針）。画面は真偽値として扱うので false に寄せる。
  isCooperationDay: z
    .boolean()
    .nullable()
    .default(false)
    .transform((value) => value ?? false),
  openedAt: z.string().nullable().default(null),
})
export type CalendarDaySummary = z.infer<typeof calendarDaySummarySchema>

export const eventCalendarSchema = z.object({
  event: eventDetailSchema,
  serverNow: z.string(),
  today: z.string(),
  days: z.array(calendarDaySummarySchema),
  todayCooperation: cooperationProgressSchema.nullable().default(null),
})
export type EventCalendar = z.infer<typeof eventCalendarSchema>

export const knowledgeContentSchema = z.object({
  kind: z.literal('KNOWLEDGE'),
  knowledgeId: z.string(),
  title: z.string(),
  body: z.string(),
  imageUrl: z.string().nullish(),
  category: z.string().nullish(),
})

export const stickerContentSchema = z.object({
  kind: z.literal('STICKER'),
  sticker: stickerItemSchema,
})

export const openedDayContentSchema = z.discriminatedUnion('kind', [
  knowledgeContentSchema,
  stickerContentSchema,
])
export type OpenedDayContent = z.infer<typeof openedDayContentSchema>

export const openedDayResponseSchema = z.object({
  eventId: z.string(),
  dayId: z.string(),
  date: z.string(),
  content: openedDayContentSchema,
})
export type OpenedDayResponse = z.infer<typeof openedDayResponseSchema>

export const openDayResponseSchema = openedDayResponseSchema.extend({
  grant: z
    .object({
      id: z.string(),
      /** KNOWLEDGE | STICKER */
      kind: z.string(),
      grantedAt: z.string(),
      /** DAILY_OPENING | COOPERATION | EVENT_DAY */
      source: z.string(),
    })
    .optional(),
  cooperation: z
    .object({
      progress: cooperationProgressSchema,
      newlyAchieved: z.boolean(),
    })
    .nullable()
    .default(null),
})
export type OpenDayResponse = z.infer<typeof openDayResponseSchema>
