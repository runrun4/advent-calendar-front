/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

// ============================================
// プリキャッシュ
// ============================================

// vite-plugin-pwa (injectManifest) がビルド時に差し込む
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// registerType: 'autoUpdate' に合わせて、新しい SW を即座に有効化する
self.skipWaiting()
clientsClaim()

// ============================================
// Push 通知
// ============================================

/** バックエンドが送る通知ペイロード */
type PushPayload = {
  title: string
  body: string
  url: string
  tag?: string
}

const DEFAULT_TITLE = 'めくるん'
const DEFAULT_URL = '/'
const ICON_URL = '/pwa-192x192.png'
const BADGE_URL = '/pwa-192x192.png'

function parsePushData(event: PushEvent): PushPayload {
  if (!event.data) {
    return { title: DEFAULT_TITLE, body: '', url: DEFAULT_URL }
  }

  // JSON でない（プレーンテキストの）ペイロードでも本文として表示できるようにする
  try {
    const parsed = event.data.json() as Partial<PushPayload> | null

    if (parsed && typeof parsed === 'object') {
      return {
        title:
          typeof parsed.title === 'string' && parsed.title !== ''
            ? parsed.title
            : DEFAULT_TITLE,
        body: typeof parsed.body === 'string' ? parsed.body : '',
        url:
          typeof parsed.url === 'string' && parsed.url !== ''
            ? parsed.url
            : DEFAULT_URL,
        ...(typeof parsed.tag === 'string' ? { tag: parsed.tag } : {}),
      }
    }
  } catch {
    // JSON ではなかった
  }

  return {
    title: DEFAULT_TITLE,
    body: event.data.text(),
    url: DEFAULT_URL,
  }
}

self.addEventListener('push', (event) => {
  const payload = parsePushData(event)

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: ICON_URL,
      badge: BADGE_URL,
      ...(payload.tag !== undefined ? { tag: payload.tag } : {}),
      data: { url: payload.url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data as { url?: string } | undefined
  const targetUrl = new URL(data?.url ?? DEFAULT_URL, self.location.origin).href

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      // 既にアプリが開いていればそのウィンドウをフォーカスする。
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin)) {
          await client.focus()

          /*
           * このアプリは URL ルーターを持たず状態遷移だけで画面を切り替えるため、
           * クライアント側は現状このメッセージを購読していない（focus だけで十分）。
           * ルーターを導入したら、このメッセージを受けて url へ遷移させる。
           */
          client.postMessage({ type: 'notification-click', url: targetUrl })
          return
        }
      }

      await self.clients.openWindow(targetUrl)
    })(),
  )
})

// ============================================
// 購読の失効・ローテーション
// ============================================

/**
 * PushSubscriptionChangeEvent は TS の標準 lib に入っていないため自前で定義する。
 */
type PushSubscriptionChangeEvent = ExtendableEvent & {
  oldSubscription?: PushSubscription | null
  newSubscription?: PushSubscription | null
}

self.addEventListener('pushsubscriptionchange', (event) => {
  const changeEvent = event as PushSubscriptionChangeEvent

  event.waitUntil(
    (async () => {
      const applicationServerKey =
        changeEvent.oldSubscription?.options.applicationServerKey ?? null

      if (!applicationServerKey) return

      try {
        const subscription =
          changeEvent.newSubscription ??
          (await self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          }))

        /*
         * Service Worker からは Supabase のアクセストークンを読めないので、
         * PUT /v1/me/push-subscriptions は開いているクライアントに依頼する。
         * 開いているクライアントが 1 つも無い場合はここで諦めてよい。
         * 次回起動時に enablePushNotifications() が同じ購読を PUT し直して同期する。
         */
        const clientList = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        })

        for (const client of clientList) {
          client.postMessage({
            type: 'push-resubscribe',
            endpoint: subscription.endpoint,
          })
        }
      } catch (error) {
        console.warn('pushsubscriptionchange resubscribe failed', error)
      }
    })(),
  )
})
