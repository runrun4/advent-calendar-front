import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './apiClient'
import { fetchPushConfig } from './pushNotificationService'

vi.mock('./authService', () => ({
  getAccessToken: async () => 'test-token',
}))

function mockResponse(body: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        }),
    ),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('fetchPushConfig', () => {
  it('契約どおりの応答は検証して返す', async () => {
    mockResponse({ enabled: true, vapidPublicKey: 'BEl62iUYgUivxIkv69yViEu' })

    const config = await fetchPushConfig()

    expect(config).toEqual({
      enabled: true,
      vapidPublicKey: 'BEl62iUYgUivxIkv69yViEu',
    })
  })

  it('形が違う応答は ApiError にする', async () => {
    mockResponse({ enabled: 'true', vapidPublicKey: null })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(fetchPushConfig()).rejects.toBeInstanceOf(ApiError)
  })
})
