import { z } from 'zod'

/**
 * API のエラーコード。
 *
 * 正本は runrun-backend の `docs/api/openapi.yaml`（ErrorResponse.code の enum）。
 * フロント都合で勝手に値を足さないこと。増やすときは先に API 契約を変える。
 */
export const apiErrorCodeSchema = z.enum([
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'INVALID_ARGUMENT',
  'DAY_LOCKED',
  'DAY_EXPIRED',
  'DAY_NOT_OPENED',
  'EVENT_CANCELED',
  'INVITATION_EXPIRED',
  'INVITATION_INVALID',
  'CONFLICT',
  'BOARD_ITEM_VERSION_CONFLICT',
  'BOARD_FULL',
  'PUSH_SUBSCRIPTION_LIMIT',
  'INTERNAL_ERROR',
])

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>

/** エラーレスポンスの共通形（openapi.yaml の ErrorResponse）。 */
export const apiErrorResponseSchema = z.object({
  code: apiErrorCodeSchema,
  message: z.string(),
  traceId: z.string(),
})

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>

/**
 * openapi.yaml の User。
 * avatarUrl は required に含まれないので、欠けていれば null として扱う。
 */
export const userSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable().default(null),
})

export type ApiUser = z.infer<typeof userSchema>

/**
 * 一覧フィールド用。null / 未指定を空配列として受ける。
 * Go の nil スライスが `null` で届く可能性があり、移行前のコードも
 * `data.events ?? []` の形で同じ手当てをしていた。
 */
export function nullableArray<T extends z.ZodType>(item: T) {
  return z
    .array(item)
    .nullable()
    .default([])
    .transform((value) => value ?? [])
}
