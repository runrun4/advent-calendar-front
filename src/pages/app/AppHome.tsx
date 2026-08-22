import { useState } from 'react'
import { ProfileModal } from '../../components/profile/ProfileModal'
import { usePageSwipe } from '../../hooks/usePageSwipe'
import type { User } from '../../types/user'
import type { BoardOrientation } from '../../services/eventApi'
import { EventAddModal } from '../event/EventAddModal'
import { EventMainPage } from '../event/EventMainPage'
import { PrivateCalendarPage } from '../private-calendar/PrivateCalendarPage'

type AppTab = 'private' | 'event'

const TABS: AppTab[] = ['private', 'event']

type AppHomeProps = {
  user: User | null
  onLoggedOut: () => void
  onUserUpdated?: (user: User) => void
}

export function AppHome({ user, onLoggedOut, onUserUpdated }: AppHomeProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isEventAddOpen, setIsEventAddOpen] = useState(false)
  const [eventAddStartDate, setEventAddStartDate] = useState<string | null>(null)
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false)
  const [eventsRefreshKey, setEventsRefreshKey] = useState(0)
  const [isWaitingForEventTransition, setIsWaitingForEventTransition] =
    useState(false)
  const [pendingEvent, setPendingEvent] = useState<{
    id: string
    name: string
    startDate: string
    boardOrientation?: BoardOrientation
    mode?: string
    iconId?: string
    boardEdited?: boolean
  } | null>(null)
  const {
    activeTab,
    currentIndex,
    dragOffset,
    isDragging,
    pointerHandlers,
    setActiveTab,
  } = usePageSwipe(TABS, 'private', isEventDetailOpen)

  const openEventAdd = (startDate?: string) => {
    setEventAddStartDate(startDate ?? null)
    setIsEventAddOpen(true)
  }

  const closeEventAdd = () => {
    setIsEventAddOpen(false)
    setEventAddStartDate(null)
  }

  return (
    <div className="app-shell">
      <div className="app-shell__top" aria-hidden="true" />

      <main className="app-shell__main" {...pointerHandlers}>
        <div
          className="page-slider"
          onTransitionEnd={(event) => {
            if (
              event.propertyName === 'transform' &&
              activeTab === 'event'
            ) {
              setIsWaitingForEventTransition(false)
            }
          }}
          style={{
            transform: `translateX(calc(-${currentIndex * 50}% + ${dragOffset}px))`,
            transition: isDragging ? 'none' : 'transform 0.3s ease',
          }}
        >
          <div className="page-slider__page">
            <PrivateCalendarPage onOpenEventAdd={openEventAdd} />
          </div>
          <div className="page-slider__page">
            <EventMainPage
              profileIconUrl={user?.iconUrl}
              eventsRefreshKey={eventsRefreshKey}
              pendingEvent={
                isWaitingForEventTransition ? null : pendingEvent
              }
              onOpenProfile={() => setIsProfileOpen(true)}
              onOpenEventAdd={openEventAdd}
              onDetailOpenChange={setIsEventDetailOpen}
              onPendingEventConsumed={() => setPendingEvent(null)}
            />
          </div>
        </div>

        {(activeTab === 'private' ||
          (activeTab === 'event' && !isEventDetailOpen)) && (
            <div className="page-indicator" aria-label="ページ位置">
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
        onClose={() => setIsProfileOpen(false)}
        onLoggedOut={onLoggedOut}
        onUserUpdated={onUserUpdated}
      />

      <EventAddModal
        isOpen={isEventAddOpen}
        initialStartDate={eventAddStartDate}
        onClose={closeEventAdd}
        onCreated={(event) => {
          setEventsRefreshKey((key) => key + 1)
          setPendingEvent({
            id: event.id,
            name: event.name,
            startDate: event.startDate,
            boardOrientation: event.boardOrientation,
            mode: event.mode,
            iconId: event.iconId,
            boardEdited: event.boardEdited,
          })
          setIsWaitingForEventTransition(activeTab !== 'event')
          setActiveTab('event')
        }}
      />
    </div>
  )
}
