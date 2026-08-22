import { useEffect, useState } from 'react'
import {
  getNotificationPermission,
  getServiceWorkerRegistration,
  requestNotificationPermission,
} from '../services/pushNotificationService'

export function NotificationPermissionButton() {
  const [permission, setPermission] =
    useState<NotificationPermission>('default')

  const [serviceWorkerReady, setServiceWorkerReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const initialize = async () => {
      setPermission(getNotificationPermission())

      try {
        await getServiceWorkerRegistration()
        setServiceWorkerReady(true)
      } catch (error) {
        console.error('Service Workerの確認に失敗しました:', error)
        setMessage('Service Workerを確認できませんでした')
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

      if (result === 'granted') {
        setMessage('通知が許可されました')
      } else if (result === 'denied') {
        setMessage('通知が拒否されました')
      } else {
        setMessage('通知の許可が選択されませんでした')
      }
    } catch (error) {
      console.error('通知許可の取得に失敗しました:', error)

      if (error instanceof Error) {
        setMessage(error.message)
      } else {
        setMessage('通知許可の取得に失敗しました')
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
        通知許可状態: {permission}
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