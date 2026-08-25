import { z } from 'zod'

/**
 * Web Push 系エンドポイントのレスポンススキーマ。
 *
 * 正本は runrun-backend の `docs/api/openapi.yaml`
 * （PushConfigResponse / PushSubscriptionResponse / PushTestResponse）。
 * リクエスト本文はブラウザの PushSubscription をそのまま送るので検証しない。
 */

export const pushConfigSchema = z.object({
  enabled: z.boolean(),
  vapidPublicKey: z.string().nullable().default(null),
})
export type PushConfig = z.infer<typeof pushConfigSchema>

export const pushSubscriptionResponseSchema = z.object({
  id: z.string(),
  endpoint: z.string(),
  createdAt: z.string(),
})
export type PushSubscriptionResponse = z.infer<
  typeof pushSubscriptionResponseSchema
>

export const pushTestResultSchema = z.object({
  /** 送信できた端末数 */
  sent: z.number(),
  /** 送信できなかった端末数 */
  failed: z.number(),
})
export type PushTestResult = z.infer<typeof pushTestResultSchema>
