import { useCallback, useEffect, useRef, useState } from 'react'
import { ProfileModal } from '../../components/profile/ProfileModal'
import {
  listenForPushResubscribe,
  syncPushSubscription,
} from '../../services/pushNotificationService'
import { useInviteAccept } from '../../hooks/useInviteAccept'
import { usePageSwipe } from '../../hooks/usePageSwipe'
import type { User } from '../../types/user'
import type { EventSummary } from '../../services/eventApi'
import { EventAddModal } from '../event/EventAddModal'
import { EventMainPage } from '../event/EventMainPage'
import { InviteAcceptModal } from '../event/InviteAcceptModal'
import { PrivateCalendarPage } from '../private-calendar/PrivateCalendarPage'

type AppTab = 'private' | 'event'

const TABS: AppTab[] = [
  'private',
  'event',
]

type AppHomeProps = {
  user: User | null
  onLoggedOut: () => void
  onUserUpdated?: (user: User) => void
}

export function AppHome({
  user,
  onLoggedOut,
  onUserUpdated,
}: AppHomeProps) {
  const [isProfileOpen, setIsProfileOpen] =
    useState(false)

  const [isEventAddOpen, setIsEventAddOpen] =
    useState(false)

  const [eventAddStartDate, setEventAddStartDate] =
    useState<string | null>(null)

  const [isEventDetailOpen, setIsEventDetailOpen] =
    useState(false)

  const [eventsRefreshKey, setEventsRefreshKey] =
    useState(0)

  const [
    isWaitingForEventTransition,
    setIsWaitingForEventTransition,
  ] = useState(false)

  const [pendingEvent, setPendingEvent] =
    useState<EventSummary | null>(null)

  const {
    activeTab,
    currentIndex,
    dragOffset,
    isDragging,
    pointerHandlers,
    setActiveTab,
  } = usePageSwipe(
    TABS,
    'event',
    // イベント詳細（星座カレンダー含む）表示中は横スワイプを止める
    // （星座側が touch-action: none でドラッグを掴むため）
    isEventDetailOpen,
  )

  const hasSyncedPush = useRef(false)

  const refreshEvents = useCallback(() => {
    setEventsRefreshKey((key) => key + 1)
  }, [])

  /*
   * ログイン後の起動時に 1 回だけ Push 購読をサーバと同期する。
   * 既に許可済み・購読済みのときだけ再登録して、
   * VAPID 鍵のローテーションやサーバ側の購読消失に追従させる。
   * ここでは通知許可を求めない（失敗はログのみ）。
   */
  useEffect(() => {
    if (user === null) return
    if (hasSyncedPush.current) return
    hasSyncedPush.current = true

    void syncPushSubscription()
  }, [user])

  /*
   * Service Worker の pushsubscriptionchange から再登録を依頼された場合に、
   * 認証トークンを持つクライアント側で PUT し直す。
   */
  useEffect(() => {
    if (user === null) return
    return listenForPushResubscribe()
  }, [user])

  /*
   * 招待リンクで開かれていた場合の承認。
   * AppHome は認証が済んだ後にしか描画されないので、
   * ここに来た時点で承認APIを叩いてよい。
   */
  const { result: inviteResult, dismissResult: dismissInviteResult } =
    useInviteAccept({
      enabled: user !== null,
      onJoined: refreshEvents,
    })

  const openEventAdd = (
    startDate?: string,
  ) => {
    setEventAddStartDate(
      startDate ?? null,
    )
    setIsEventAddOpen(true)
  }

  const closeEventAdd = () => {
    setIsEventAddOpen(false)
    setEventAddStartDate(null)
  }

  return (
    <div className="app-shell">
      <div
        className="app-shell__top"
        aria-hidden="true"
      />

      <main
        className="app-shell__main"
        {...pointerHandlers}
      >
        <div
          className="page-slider"
          onTransitionEnd={(event) => {
            if (
              event.propertyName === 'transform' &&
              activeTab === 'event'
            ) {
              setIsWaitingForEventTransition(
                false,
              )
            }
          }}
          style={{
            transform: `translateX(calc(-${
              currentIndex * 50
            }% + ${dragOffset}px))`,
            transition: isDragging
              ? 'none'
              : 'transform 0.3s ease',
          }}
        >
          <div className="page-slider__page">
            <PrivateCalendarPage
              onOpenEventAdd={openEventAdd}
            />
          </div>

          <div className="page-slider__page">
            <EventMainPage
              currentUser={user}
              profileIconUrl={user?.iconUrl}
              eventsRefreshKey={
                eventsRefreshKey
              }
              pendingEvent={
                isWaitingForEventTransition
                  ? null
                  : pendingEvent
              }
              isEventPageActive={
                activeTab === 'event'
              }
              onOpenProfile={() =>
                setIsProfileOpen(true)
              }
              onOpenEventAdd={openEventAdd}
              onDetailOpenChange={
                setIsEventDetailOpen
              }
              onPendingEventConsumed={() =>
                setPendingEvent(null)
              }
            />
          </div>
        </div>

        {(activeTab === 'private' ||
          (activeTab === 'event' &&
            !isEventDetailOpen)) && (
          <div
            className="page-indicator"
            aria-label="ページ位置"
          >
            {TABS.map((tab) => (
              <span
                key={tab}
                className={
                  activeTab === tab
                    ? 'page-indicator__dot is-active'
                    : 'page-indicator__dot'
                }
              />
            ))}
          </div>
        )}
      </main>

      <ProfileModal
        isOpen={isProfileOpen}
        user={user}
        onClose={() =>
          setIsProfileOpen(false)
        }
        onLoggedOut={onLoggedOut}
        onUserUpdated={onUserUpdated}
      />

      <EventAddModal
        isOpen={isEventAddOpen}
        initialStartDate={
          eventAddStartDate
        }
        onClose={closeEventAdd}
        onCreated={(event) => {
          setEventsRefreshKey((key) => key + 1)
          setPendingEvent(event)
          setIsWaitingForEventTransition(activeTab !== 'event')
          setActiveTab('event')
        }}
      />

      <InviteAcceptModal
        result={inviteResult}
        onClose={() => {
          // 参加できたときは参加先を探せるイベント一覧へ寄せる。
          if (inviteResult?.kind !== 'failed') {
            setActiveTab('event')
          }
          dismissInviteResult()
        }}
      />
    </div>
  )
}
