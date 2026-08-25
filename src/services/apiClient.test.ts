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

/**
 * mockResponse と違い、本文を JSON.stringify に通さない生の Response を返す。
 * 「200 だが本文が JSON ではない」= レスポンスの JSON パースが失敗する経路を作る。
 */
function mockRawResponse(body: string, status = 200) {
  const fetchMock = vi.fn(
    async () =>
      new Response(body, {
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

  it('契約に無いエラーコードでもそのまま保つ', async () => {
    // バックエンドが code を増やしても、フロントが握り潰して UNKNOWN に
    // すり替えないこと（enum 外は fallback で生の文字列を素通しする）。
    mockResponse({ code: 'SOMETHING_NEW', message: 'x', traceId: 't' }, 400)

    const error = (await apiRequestValidated('/v1/things', schema, {
      auth: false,
    }).catch((thrown: unknown) => thrown)) as ApiError

    expect(error.code).toBe('SOMETHING_NEW')
    expect(error.message).toBe('x')
    expect(error.traceId).toBe('t')
    expect(error.status).toBe(400)
  })

  it('成功応答でも本文が JSON でなければ ApiError にする', async () => {
    // 200 なのに本文が空（プロキシやリバースプロキシの事故で起きる）。
    // response.json() が投げるので、検証まで届かず apiRequestWithStatus で止まる。
    mockRawResponse('', 200)

    const error = (await apiRequestValidated('/v1/things', schema, {
      auth: false,
    }).catch((thrown: unknown) => thrown)) as ApiError

    expect(error).toBeInstanceOf(ApiError)
    expect(error.message).toBe('サーバーから不正な応答を受信しました。')
    expect(error.status).toBe(200)
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
