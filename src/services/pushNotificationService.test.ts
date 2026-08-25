import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './apiClient'
import {
  enablePushNotifications,
  fetchPushConfig,
  sendTestNotification,
} from './pushNotificationService'

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

const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkFZ2UU1S0'

const PUSH_ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc'

/** PUT /v1/me/push-subscriptions が返す形(pushSubscriptionResponse)。 */
const subscriptionResponse = {
  id: '00000000-0000-4000-8000-0000000000a1',
  endpoint: PUSH_ENDPOINT,
  createdAt: '2026-08-08T09:00:00Z',
}

/**
 * enablePushNotifications が通る経路(Push API / Service Worker / 通知許可)を
 * jsdom に生やす。購読は未登録の状態から subscribe させる。
 */
function stubPushEnvironment() {
  const subscription = {
    endpoint: PUSH_ENDPOINT,
    options: { applicationServerKey: null },
    toJSON: () => ({
      endpoint: PUSH_ENDPOINT,
      expirationTime: null,
      keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
    }),
    unsubscribe: async () => true,
  }

  const registration = {
    pushManager: {
      getSubscription: async () => null,
      subscribe: async () => subscription,
    },
  }

  vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('Notification', { permission: 'granted' })
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { ready: Promise.resolve(registration) },
  })
}

/** /v1/push/config と PUT /v1/me/push-subscriptions を出し分ける。 */
function mockPushRoutes(subscriptionBody: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const body = url.includes('/v1/push/config')
        ? { enabled: true, vapidPublicKey: VAPID_PUBLIC_KEY }
        : subscriptionBody

      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  Reflect.deleteProperty(navigator, 'serviceWorker')
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

describe('enablePushNotifications', () => {
  it('PUT の応答を検証して返す', async () => {
    stubPushEnvironment()
    mockPushRoutes(subscriptionResponse)

    await expect(enablePushNotifications()).resolves.toEqual(
      subscriptionResponse,
    )
  })

  // PUT の応答も検証していないと、契約と違う購読情報がそのまま
  // 呼び出し側(通知設定画面)へ渡る。
  it('形が違う応答は ApiError にする', async () => {
    stubPushEnvironment()
    mockPushRoutes({ ...subscriptionResponse, createdAt: 12345 })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(enablePushNotifications()).rejects.toBeInstanceOf(ApiError)
  })
})

describe('sendTestNotification', () => {
  it('POST の応答を検証して返す', async () => {
    mockResponse({ sent: 2, failed: 0 })

    await expect(sendTestNotification()).resolves.toEqual({
      sent: 2,
      failed: 0,
    })
  })

  it('形が違う応答は ApiError にする', async () => {
    mockResponse({ sent: '2', failed: 0 })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(sendTestNotification()).rejects.toBeInstanceOf(ApiError)
  })
})
