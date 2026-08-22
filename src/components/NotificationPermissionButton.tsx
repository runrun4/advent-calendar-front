import { useEffect, useState } from 'react'
import {
  getExistingPushSubscription,
  getNotificationPermission,
  getPushManager,
  getServiceWorkerRegistration,
  requestNotificationPermission,
} from '../services/pushNotificationService'

export function NotificationPermissionButton() {
  const [permission, setPermission] =
    useState<NotificationPermission>('default')

  const [serviceWorkerReady, setServiceWorkerReady] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)
  const [subscriptionExists, setSubscriptionExists] = useState(false)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const initialize = async () => {
      setPermission(getNotificationPermission())

      try {
        await getServiceWorkerRegistration()
        setServiceWorkerReady(true)

        await getPushManager()
        setPushSupported(true)

        const subscription = await getExistingPushSubscription()

        setSubscriptionExists(subscription !== null)

        console.log('既存のPush Subscription:', subscription)
      } catch (error) {
        console.error('Push APIの確認に失敗しました:', error)
      }
    }

    initialize()
  }, [])

  const handleRequestPermission = async () => {
    setLoading(true)
    setMessage('')

    try {
      const registration = await getServiceWorkerRegistration()

      console.log('Service Worker:', registration)

      const result = await requestNotificationPermission()

      setPermission(result)

      if (result !== 'granted') {
        if (result === 'denied') {
          setMessage('通知が拒否されました')
        } else {
          setMessage('通知の許可が選択されませんでした')
        }

        return
      }

      const pushManager = await getPushManager()

      console.log('PushManager:', pushManager)

      const existingSubscription =
        await getExistingPushSubscription()

      setSubscriptionExists(existingSubscription !== null)

      if (existingSubscription) {
        console.log(
          '既存のPush Subscription:',
          existingSubscription,
        )

        setMessage('既存のPush Subscriptionを確認しました')
      } else {
        setMessage(
          '通知は許可されました。Push Subscriptionはまだ作成していません',
        )
      }
    } catch (error) {
      console.error('通知設定の確認に失敗しました:', error)

      if (error instanceof Error) {
        setMessage(error.message)
      } else {
        setMessage('通知設定の確認に失敗しました')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        padding: '20px',
        margin: '20px',
        border: '1px solid #ddd',
        borderRadius: '12px',
      }}
    >
      <h2>通知テスト</h2>

      <p>
        Service Worker:{' '}
        {serviceWorkerReady ? '準備完了' : '確認中...'}
      </p>

      <p>
        Push API:{' '}
        {pushSupported ? '利用可能' : '確認中...'}
      </p>

      <p>
        通知許可状態: {permission}
      </p>

      <p>
        Push Subscription:{' '}
        {subscriptionExists ? '存在します' : 'まだありません'}
      </p>

      <button
        type="button"
        onClick={handleRequestPermission}
        disabled={loading || !serviceWorkerReady}
        style={{
          padding: '12px 20px',
          border: 'none',
          borderRadius: '8px',
          cursor:
            loading || !serviceWorkerReady
              ? 'not-allowed'
              : 'pointer',
        }}
      >
        {loading ? '処理中...' : '通知を許可する'}
      </button>

      {message && (
        <p style={{ marginTop: '12px' }}>
          {message}
        </p>
      )}
    </div>
  )
}