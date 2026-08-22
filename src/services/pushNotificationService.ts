import { apiRequest } from './apiClient'

/**
 * 標準 Web Push (VAPID) の購読まわり。
 *
 * Firebase / FCM は使わず、ブラウザ標準の PushManager だけで完結させる。
 * 対象は iOS 16.4+ のホーム画面追加 PWA と Android Chrome。
 */

export type PushConfig = {
  enabled: boolean
  vapidPublicKey: string | null
}

export type PushSubscriptionResponse = {
  id: string
  endpoint: string
  createdAt: string
}

export type PushTestResult = {
  sent: number
  failed: number
}

export type PushStatus = {
  /** Push API + Service Worker + Notification が揃っているか */
  supported: boolean
  /** Notification.permission。非対応環境では 'denied' 扱い */
  permission: NotificationPermission
  /** この端末・ブラウザで購読済みか */
  subscribed: boolean
  /** 購読済みの場合の endpoint */
  endpoint: string | null
}

/** navigator.serviceWorker.ready の待ち時間上限 */
const SERVICE_WORKER_READY_TIMEOUT_MS = 10_000

/**
 * PushSubscription.toJSON() の戻り値。
 * 標準の PushSubscriptionJSON は endpoint / keys が optional なので、
 * サーバへ送る前にここで narrow する。
 */
type PushSubscriptionPayload = {
  endpoint: string
  expirationTime: string | null
  keys: {
    p256dh: string
    auth: string
  }
  userAgent?: string
}

// ============================================
// 環境判定
// ============================================

/** Push 通知に必要な API がすべて揃っているか */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * ホーム画面に追加された状態（スタンドアロン）で起動しているか。
 * InstallAppPrompt.tsx の isPWA() と同じ判定。
 * iOS 16.4+ ではスタンドアロンでないと Push を購読できない。
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false

  const standalone = window.matchMedia('(display-mode: standalone)').matches

  const iosStandalone =
    (
      window.navigator as Navigator & {
        standalone?: boolean
      }
    ).standalone === true

  return standalone || iosStandalone
}

/** iOS / iPadOS か（iPadOS 13+ は Mac を名乗るのでタッチ有無で判定） */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false

  const ua = window.navigator.userAgent

  if (/iPad|iPhone|iPod/.test(ua)) return true

  // iPadOS 13+ はデスクトップ Safari の UA を返す
  return ua.includes('Macintosh') && navigator.maxTouchPoints > 1
}

// ============================================
// 鍵の変換
// ============================================

/**
 * VAPID 公開鍵 (base64url) を applicationServerKey 用の Uint8Array へ変換する。
 * atob は標準 base64 しか受け付けないのでパディングと文字を戻してから渡す。
 */
function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')

  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)

  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }

  return output
}

/** ArrayBuffer を base64url 文字列へ戻す（既存購読の鍵比較用） */
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''

  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }

  return window
    .btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// ============================================
// API
// ============================================

export async function fetchPushConfig(): Promise<PushConfig> {
  return apiRequest<PushConfig>('/v1/push/config')
}

async function registerSubscription(
  payload: PushSubscriptionPayload,
): Promise<PushSubscriptionResponse> {
  return apiRequest<PushSubscriptionResponse>('/v1/me/push-subscriptions', {
    method: 'PUT',
    body: payload,
  })
}

async function unregisterSubscription(endpoint: string): Promise<void> {
  await apiRequest<void>(
    `/v1/me/push-subscriptions?endpoint=${encodeURIComponent(endpoint)}`,
    { method: 'DELETE' },
  )
}

/** サーバ側から自分の全購読へテスト通知を送る */
export async function sendTestNotification(): Promise<PushTestResult> {
  return apiRequest<PushTestResult>('/v1/me/push-subscriptions/test', {
    method: 'POST',
  })
}

// ============================================
// Service Worker
// ============================================

/**
 * navigator.serviceWorker.ready をタイムアウト付きで待つ。
 * iOS では SW の activate が遅れて ready が解決しないことがあるため、
 * 無限に待たずにエラーへ倒してユーザーへ再試行を促す。
 */
async function waitForServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('このブラウザは Service Worker に対応していません')
  }

  let timeoutId: number | undefined

  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(
        new Error(
          'Service Worker の準備がタイムアウトしました。アプリを再起動してからもう一度お試しください。',
        ),
      )
    }, SERVICE_WORKER_READY_TIMEOUT_MS)
  })

  try {
    return await Promise.race([navigator.serviceWorker.ready, timeout])
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId)
  }
}

/** 既存購読を PushSubscriptionPayload に変換する（不足があれば null） */
function toPayload(
  subscription: PushSubscription,
): PushSubscriptionPayload | null {
  const json = subscription.toJSON()
  const endpoint = json.endpoint ?? subscription.endpoint
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth

  if (!endpoint || !p256dh || !auth) return null

  return {
    endpoint,
    // ブラウザは epoch ミリ秒（number）を返すが、API の契約は ISO 文字列
    expirationTime:
      typeof json.expirationTime === 'number'
        ? new Date(json.expirationTime).toISOString()
        : null,
    keys: { p256dh, auth },
    userAgent: navigator.userAgent,
  }
}

// ============================================
// 状態取得
// ============================================

export async function getPushStatus(): Promise<PushStatus> {
  if (!isPushSupported()) {
    return {
      supported: false,
      permission: 'denied',
      subscribed: false,
      endpoint: null,
    }
  }

  const permission = Notification.permission

  // 許可前は購読が存在しないので SW を待たずに返す。
  if (permission !== 'granted') {
    return {
      supported: true,
      permission,
      subscribed: false,
      endpoint: null,
    }
  }

  try {
    const registration = await waitForServiceWorker()
    const subscription = await registration.pushManager.getSubscription()

    return {
      supported: true,
      permission,
      subscribed: subscription !== null,
      endpoint: subscription?.endpoint ?? null,
    }
  } catch (error) {
    console.warn('failed to read push subscription', error)
    return {
      supported: true,
      permission,
      subscribed: false,
      endpoint: null,
    }
  }
}

/**
 * 通知許可を求める。
 *
 * iOS Safari は user activation（タップ）の同期的な延長でしか
 * Notification.requestPermission() を受け付けない。
 * この関数の中で await を挟むと activation が切れて必ず拒否されるので、
 * 事前チェック以外は何もせずそのまま Promise を返す。
 */
export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    return Promise.reject(
      new Error('このブラウザは通知に対応していません'),
    )
  }

  return Notification.requestPermission()
}

// ============================================
// 有効化 / 無効化
// ============================================

/**
 * Push 通知を有効にする。
 *
 * 1. サーバから VAPID 公開鍵を取得
 * 2. Service Worker の準備を待つ
 * 3. 既存購読の applicationServerKey が現在の鍵と違えば unsubscribe（鍵ローテーション対応）
 * 4. subscribe して PUT /v1/me/push-subscriptions で登録
 *
 * 起動時の同期用途でも呼べるよう、既に購読済みでも PUT で上書き登録する（冪等）。
 */
export async function enablePushNotifications(): Promise<PushSubscriptionResponse> {
  if (!isPushSupported()) {
    throw new Error('このブラウザは通知に対応していません')
  }

  if (isIOS() && !isStandalone()) {
    throw new Error(
      '通知を使うにはホーム画面に追加してから開いてください',
    )
  }

  if (Notification.permission !== 'granted') {
    throw new Error('通知が許可されていません')
  }

  const config = await fetchPushConfig()
  if (!config.enabled || !config.vapidPublicKey) {
    throw new Error('サーバ側で通知が有効になっていません')
  }

  const applicationServerKey = urlBase64ToUint8Array(config.vapidPublicKey)
  const registration = await waitForServiceWorker()

  let subscription = await registration.pushManager.getSubscription()

  // 既存購読が古い VAPID 鍵で作られていたら作り直す。
  if (subscription) {
    const existingKey = subscription.options.applicationServerKey
    const existingKeyBase64 = existingKey
      ? arrayBufferToBase64Url(existingKey)
      : null

    if (existingKeyBase64 !== config.vapidPublicKey) {
      await subscription.unsubscribe()
      subscription = null
    }
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource,
    })
  }

  const payload = toPayload(subscription)
  if (!payload) {
    throw new Error('購読情報の取得に失敗しました')
  }

  return registerSubscription(payload)
}

/**
 * Push 通知を無効にする。
 * サーバの購読を消してからブラウザ側を unsubscribe する。
 * サーバ側が既に無い場合でもローカルの unsubscribe は行う。
 */
export async function disablePushNotifications(): Promise<void> {
  if (!isPushSupported()) return

  const registration = await waitForServiceWorker()
  const subscription = await registration.pushManager.getSubscription()

  if (!subscription) return

  try {
    await unregisterSubscription(subscription.endpoint)
  } finally {
    await subscription.unsubscribe()
  }
}

/**
 * 起動時の静かな同期。
 *
 * 既に許可済みかつ購読済みのときだけ enablePushNotifications() を呼び、
 * VAPID 鍵のローテーションやサーバ側の購読消失に追従する。
 * 失敗してもユーザーには見せず、ログだけ残す。
 */
export async function syncPushSubscription(): Promise<void> {
  if (!isPushSupported()) return
  if (Notification.permission !== 'granted') return
  if (isIOS() && !isStandalone()) return

  try {
    const registration = await waitForServiceWorker()
    const subscription = await registration.pushManager.getSubscription()

    // 未購読なら勝手に購読しない（ユーザーが OFF にしている可能性がある）
    if (!subscription) return

    await enablePushNotifications()
  } catch (error) {
    console.warn('push subscription sync failed', error)
  }
}

/**
 * Service Worker からの pushsubscriptionchange 依頼を受けて再登録する。
 *
 * SW からは Supabase のアクセストークンが取れないため、
 * 実際の PUT は開いているクライアント（＝ここ）が行う。
 */
export function listenForPushResubscribe(): () => void {
  if (!('serviceWorker' in navigator)) {
    return () => {}
  }

  const handler = (event: MessageEvent) => {
    const data = event.data as { type?: string } | null
    if (data?.type !== 'push-resubscribe') return

    void enablePushNotifications().catch((error: unknown) => {
      console.warn('push resubscribe failed', error)
    })
  }

  navigator.serviceWorker.addEventListener('message', handler)

  return () => {
    navigator.serviceWorker.removeEventListener('message', handler)
  }
}
