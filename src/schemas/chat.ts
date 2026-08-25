import { z } from 'zod'
import { nullableArray, userSchema } from './common'

/**
 * チャット系エンドポイントのレスポンススキーマ。
 *
 * 正本は runrun-backend の `docs/api/openapi.yaml`（ChatMessage / MessagesResponse）。
 */

export type ChatUser = z.infer<typeof userSchema>

export const chatMessageSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  clientMessageId: z.string(),
  sender: userSchema,
  // 契約上は const TEXT（enum ではない）。増える予定が無いので literal のままにする。
  kind: z.literal('TEXT'),
  text: z.string(),
  sentAt: z.string(),
})
export type ChatMessage = z.infer<typeof chatMessageSchema>

export const messagesResponseSchema = z.object({
  /** sentAt、id の昇順。 */
  messages: nullableArray(chatMessageSchema),
  nextCursor: z.string().nullable().default(null),
})
export type MessagesResponse = z.infer<typeof messagesResponseSchema>
