import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import {
  ApiError,
  apiRequestValidated,
  apiRequestValidatedWithStatus,
} from './apiClient'

const schema = z.object({
  id: z.string(),
  count: z.number(),
})

function mockResponse(body: unknown, status = 200) {
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('apiRequestValidated', () => {
  it('契約どおりの応答は検証して返す', async () => {
    mockResponse({ id: 'a', count: 1, extra: 'ignored' })

    const data = await apiRequestValidated('/v1/things', schema, {
      auth: false,
    })

    // 契約に無いキーは落ちる
    expect(data).toEqual({ id: 'a', count: 1 })
  })

  it('形が違う応答は ApiError にする', async () => {
    mockResponse({ id: 'a', count: '1' })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const error = await apiRequestValidated('/v1/things', schema, {
      auth: false,
    }).catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toBe(
      'サーバーから不正な応答を受信しました。',
    )
    expect((error as ApiError).code).toBe('UNKNOWN')
    expect((error as ApiError).status).toBe(200)
    expect(consoleError).toHaveBeenCalledOnce()
  })

  it('必須フィールドが欠けていても ApiError にする', async () => {
    mockResponse({ id: 'a' })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      apiRequestValidated('/v1/things', schema, { auth: false }),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it('エラー応答は契約のエラー本文から ApiError を組み立てる', async () => {
    mockResponse(
      { code: 'DAY_LOCKED', message: 'まだ開けられません。', traceId: 't-1' },
      409,
    )

    const error = (await apiRequestValidated('/v1/things', schema, {
      auth: false,
    }).catch((thrown: unknown) => thrown)) as ApiError

    expect(error.code).toBe('DAY_LOCKED')
    expect(error.message).toBe('まだ開けられません。')
    expect(error.traceId).toBe('t-1')
  })

  it('契約外のエラー本文でも status は保つ', async () => {
    mockResponse('<html>502 Bad Gateway</html>', 502)

    const error = (await apiRequestValidated('/v1/things', schema, {
      auth: false,
    }).catch((thrown: unknown) => thrown)) as ApiError

    expect(error.status).toBe(502)
    expect(error.code).toBe('UNKNOWN')
  })
})

describe('apiRequestValidatedWithStatus', () => {
  it('検証済みのデータと HTTP ステータスを返す', async () => {
    mockResponse({ id: 'a', count: 2 }, 201)

    const result = await apiRequestValidatedWithStatus('/v1/things', schema, {
      method: 'POST',
      auth: false,
    })

    expect(result).toEqual({ data: { id: 'a', count: 2 }, status: 201 })
  })
})
