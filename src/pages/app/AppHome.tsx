import { useCallback, useState } from 'react'
import { ProfileModal } from '../../components/profile/ProfileModal'
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
    isEventDetailOpen,
  )

  const refreshEvents = useCallback(() => {
    setEventsRefreshKey((key) => key + 1)
  }, [])

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
