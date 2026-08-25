import { z } from 'zod'
import { userSchema } from './common'

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

/**
 * 一覧は「要素単位で許容」する。
 *
 * 配列ごと chatMessageSchema で検証すると、契約外のメッセージが1件混ざっただけで
 * 一覧全体が ApiError になり、チャットが空になってしまう。将来サーバーが kind を
 * 増やしても、読めなかったその1件だけ落として画面全体は生かす。
 * ボード（schemas/board.ts）や Realtime 側（hooks/useBoard.ts）と同じ方針。
 *
 * null / 未指定を空配列として受ける点は common.ts の nullableArray と同じ。
 */
const chatMessagesSchema = z
  .array(z.unknown())
  .nullable()
  .default([])
  .transform((messages) =>
    (messages ?? []).flatMap((message) => {
      const parsed = chatMessageSchema.safeParse(message)
      if (!parsed.success) {
        console.error(
          '契約に合わないチャットメッセージを無視します',
          parsed.error.issues,
        )
        return []
      }
      return [parsed.data]
    }),
  )

export const messagesResponseSchema = z.object({
  /** sentAt、id の昇順。 */
  messages: chatMessagesSchema,
  nextCursor: z.string().nullable().default(null),
})
export type MessagesResponse = z.infer<typeof messagesResponseSchema>
