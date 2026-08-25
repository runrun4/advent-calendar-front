import { describe, expect, it } from 'vitest'
import { apiErrorCodeSchema, apiErrorResponseSchema, userSchema } from './common'

describe('apiErrorCodeSchema', () => {
  it('API契約のエラーコードを受け入れる', () => {
    expect(apiErrorCodeSchema.safeParse('DAY_LOCKED').success).toBe(true)
    expect(apiErrorCodeSchema.safeParse('UNAUTHENTICATED').success).toBe(true)
    expect(apiErrorCodeSchema.safeParse('INTERNAL_ERROR').success).toBe(true)
  })

  it('契約に無いコードは拒否する', () => {
    expect(apiErrorCodeSchema.safeParse('SOMETHING_NEW').success).toBe(false)
    expect(apiErrorCodeSchema.safeParse('').success).toBe(false)
    expect(apiErrorCodeSchema.safeParse(500).success).toBe(false)
  })
})

describe('apiErrorResponseSchema', () => {
  it('code / message / traceId が揃っていれば通す', () => {
    const parsed = apiErrorResponseSchema.parse({
      code: 'NOT_FOUND',
      message: 'イベントが見つかりません。',
      traceId: 'trace-1',
    })

    expect(parsed.code).toBe('NOT_FOUND')
    expect(parsed.traceId).toBe('trace-1')
  })

  it('traceId が欠けていたら拒否する', () => {
    const result = apiErrorResponseSchema.safeParse({
      code: 'NOT_FOUND',
      message: 'イベントが見つかりません。',
    })

    expect(result.success).toBe(false)
  })

  it('エラー本文でない値は拒否する', () => {
    expect(apiErrorResponseSchema.safeParse(null).success).toBe(false)
    expect(apiErrorResponseSchema.safeParse('<html>502</html>').success).toBe(
      false,
    )
  })
})

describe('userSchema', () => {
  it('avatarUrl が無ければ null になる', () => {
    const parsed = userSchema.parse({ id: 'u1', displayName: 'たろう' })

    expect(parsed.avatarUrl).toBeNull()
  })

  it('契約に無いキーは落とす', () => {
    const parsed = userSchema.parse({
      id: 'u1',
      displayName: 'たろう',
      avatarUrl: null,
      unknownField: 'x',
    })

    expect(parsed).toEqual({ id: 'u1', displayName: 'たろう', avatarUrl: null })
  })

  it('displayName が文字列でなければ拒否する', () => {
    expect(userSchema.safeParse({ id: 'u1', displayName: 42 }).success).toBe(
      false,
    )
  })
})
