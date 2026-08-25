import { describe, expect, it } from 'vitest'
import {
  pushConfigSchema,
  pushSubscriptionResponseSchema,
  pushTestResultSchema,
} from './push'

describe('pushConfigSchema', () => {
  it('バックエンドが返す設定をそのまま受け入れる', () => {
    // GET /v1/push/config が返す形(pushConfigResponse)。
    const parsed = pushConfigSchema.parse({
      enabled: true,
      vapidPublicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkFZ2UU1S0',
    })

    expect(parsed.enabled).toBe(true)
    expect(parsed.vapidPublicKey).toContain('BEl62iUY')
  })

  it('鍵が null / 未指定なら null にする', () => {
    expect(
      pushConfigSchema.parse({ enabled: false, vapidPublicKey: null })
        .vapidPublicKey,
    ).toBeNull()
    expect(pushConfigSchema.parse({ enabled: false }).vapidPublicKey).toBeNull()
  })

  it('enabled が真偽値でなければ拒否する', () => {
    expect(
      pushConfigSchema.safeParse({ enabled: 'true', vapidPublicKey: null })
        .success,
    ).toBe(false)
  })
})

describe('pushSubscriptionResponseSchema', () => {
  it('バックエンドが返す購読をそのまま受け入れる', () => {
    // PUT /v1/me/push-subscriptions が返す形(pushSubscriptionResponse)。
    const parsed = pushSubscriptionResponseSchema.parse({
      id: '00000000-0000-4000-8000-0000000000a1',
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      createdAt: '2026-08-08T09:00:00Z',
    })

    expect(parsed.endpoint).toContain('fcm.googleapis.com')
  })

  it('必須フィールドが欠けていたら拒否する', () => {
    expect(
      pushSubscriptionResponseSchema.safeParse({
        id: 'p1',
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      }).success,
    ).toBe(false)
  })
})

describe('pushTestResultSchema', () => {
  it('送信件数を受け入れる', () => {
    const parsed = pushTestResultSchema.parse({ sent: 2, failed: 0 })

    expect(parsed).toEqual({ sent: 2, failed: 0 })
  })

  it('件数が数値でなければ拒否する', () => {
    expect(pushTestResultSchema.safeParse({ sent: '2', failed: 0 }).success).toBe(
      false,
    )
  })
})
