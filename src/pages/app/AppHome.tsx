import { useState } from 'react'
import { ProfileModal } from '../../components/profile/ProfileModal'
import { usePageSwipe } from '../../hooks/usePageSwipe'
import type { User } from '../../types/user'
import { EventMainPage } from '../event/EventMainPage'
import { PrivateCalendarPage } from '../private-calendar/PrivateCalendarPage'

type AppTab = 'private' | 'event'

const TABS: AppTab[] = ['private', 'event']

type AppHomeProps = {
  user: User | null
}

export function AppHome({ user }: AppHomeProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const {
    activeTab,
    currentIndex,
    dragOffset,
    isDragging,
    pointerHandlers,
  } = usePageSwipe(TABS, 'private')

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
            <PrivateCalendarPage />
          </div>
          <div className="page-slider__page">
            <EventMainPage onOpenProfile={() => setIsProfileOpen(true)} />
          </div>
        </div>

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
      </main>

      <ProfileModal
        isOpen={isProfileOpen}
        user={user}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  )
}
