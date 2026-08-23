import { useEffect, useRef, useState } from 'react'
import { Bell, UserRound } from 'lucide-react'
import appIcon from '../../assets/appicon.jpg'
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushStatus,
  isIOS,
  isPushSupported,
  isStandalone,
  requestNotificationPermission,
} from '../../services/pushNotificationService'

type HeaderProps = {
  title?: string
  iconUrl?: string | null
  onOpenProfile?: () => void
}

export function Header({
  title = 'mekulunlun',
  iconUrl = null,
  onOpenProfile,
}: HeaderProps) {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [isPushSubscribed, setIsPushSubscribed] = useState(false)
  const [pushPermission, setPushPermission] =
    useState<NotificationPermission>('default')
  const [isPushBusy, setIsPushBusy] = useState(false)
  const [pushMessage, setPushMessage] = useState<string | null>(null)
  const notificationRef = useRef<HTMLDivElement>(null)
  const pushSupported = isPushSupported()
  const needsHomeScreen = pushSupported && isIOS() && !isStandalone()

  useEffect(() => {
    let cancelled = false

    void getPushStatus().then((status) => {
      if (cancelled) return
      setPushPermission(status.permission)
      setIsPushSubscribed(status.subscribed)
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isNotificationOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!notificationRef.current?.contains(event.target as Node)) {
        setIsNotificationOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsNotificationOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isNotificationOpen])

  const handleTogglePush = () => {
    setPushMessage(null)

    if (isPushSubscribed) {
      setIsPushBusy(true)
      void disablePushNotifications()
        .then(() => {
          setIsPushSubscribed(false)
          setPushMessage('通知をオフにしました')
        })
        .catch(() => setPushMessage('通知の解除に失敗しました'))
        .finally(() => setIsPushBusy(false))
      return
    }

    // iOS Safari の許可ダイアログには、タップ直後の user activation が必要。
    const permissionPromise = requestNotificationPermission()
    setIsPushBusy(true)
    void permissionPromise
      .then(async (permission) => {
        setPushPermission(permission)
        if (permission !== 'granted') {
          throw new Error('permission denied')
        }
        await enablePushNotifications()
        setIsPushSubscribed(true)
        setPushMessage('通知をオンにしました')
      })
      .catch(() => {
        setIsPushSubscribed(false)
        setPushMessage('通知を許可できませんでした')
      })
      .finally(() => setIsPushBusy(false))
  }

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <img
          className="app-header__app-icon"
          src={appIcon}
          alt="mekulunlun"
        />

        <h1 className="page-title app-header__title">{title}</h1>
      </div>

      <div className="app-header__actions">
        <div className="app-header__notification-wrap" ref={notificationRef}>
          <button
            type="button"
            className={`app-header__notification${isPushSubscribed ? ' app-header__notification--enabled' : ''}`}
            onClick={() => {
              setPushMessage(null)
              setIsNotificationOpen((open) => !open)
            }}
            aria-label="通知設定"
            aria-expanded={isNotificationOpen}
          >
            <Bell className="app-header__notification-icon" aria-hidden="true" />
            {isPushSubscribed && (
              <span className="app-header__notification-dot" aria-hidden="true" />
            )}
          </button>

          {isNotificationOpen && (
            <div className="app-header__notification-panel" role="dialog" aria-label="通知設定">
              <strong className="app-header__notification-title">通知</strong>
              {!pushSupported ? (
                <p>このブラウザは通知に対応していません</p>
              ) : needsHomeScreen ? (
                <p>通知を使うにはホーム画面に追加してから開いてください</p>
              ) : pushPermission === 'denied' ? (
                <p>端末の設定から通知を許可してください</p>
              ) : (
                <>
                  <p>
                    アドベントカレンダーのお知らせを
                    {isPushSubscribed ? '受け取っています' : '受け取れます'}
                  </p>
                  <button
                    type="button"
                    className="app-header__notification-toggle"
                    onClick={handleTogglePush}
                    disabled={isPushBusy}
                  >
                    {isPushBusy
                      ? '設定中…'
                      : isPushSubscribed
                        ? '通知をオフにする'
                        : '通知をオンにする'}
                  </button>
                </>
              )}
              {pushMessage && (
                <p className="app-header__notification-message" role="status">
                  {pushMessage}
                </p>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          className="app-header__profile"
          onClick={onOpenProfile}
          aria-label="プロフィール"
        >
          {iconUrl ? (
            <img
              className="app-header__profile-image"
              src={iconUrl}
              alt=""
            />
          ) : (
            <UserRound
              className="app-header__profile-icon"
              aria-hidden="true"
            />
          )}
        </button>
      </div>
    </header>
  )
}