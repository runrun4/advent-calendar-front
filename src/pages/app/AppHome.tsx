import { useState } from 'react'
import { ProfileModal } from '../../components/profile/ProfileModal'
import { usePageSwipe } from '../../hooks/usePageSwipe'
import type { User } from '../../types/user'
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
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false)
const {
  activeTab,
  currentIndex,
  dragOffset,
  isDragging,
  pointerHandlers,
} = usePageSwipe(
  TABS,
  'private',
  isEventDetailOpen,
)

  const openEventAdd = () => setIsEventAddOpen(true)

  return (
    <div className="app-shell">
      <div className="app-shell__top" aria-hidden="true" />

      <main className="app-shell__main" {...pointerHandlers}>
        <div
          className="page-slider"
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
              onOpenProfile={() => setIsProfileOpen(true)}
              onOpenEventAdd={openEventAdd}
              onDetailOpenChange={setIsEventDetailOpen}
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
        onClose={() => setIsEventAddOpen(false)}
      />
    </div>
  )
}
