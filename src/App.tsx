import { useRef, useState, type PointerEvent } from 'react'
import { Header } from './components/layout/Header'
import type { AppTab } from './components/layout/TabNavigation'
import { ProfileModal } from './components/profile/ProfileModal'
import { useAuth } from './hooks/useAuth'
import { AuthPage } from './pages/auth/AuthPage'
import { InitialSetup } from './pages/auth/InitialSetup'
import { SplashScreen } from './pages/auth/SplashScreen'
import { EventMainPage } from './pages/event/EventMainPage'

import { PrivateCalendarPage } from './pages/private-calendar/PrivateCalendarPage'

const TABS: AppTab[] = ['private', 'event']
const SWIPE_THRESHOLD = 56

function App() {
  const { user, phase, setPhase } = useAuth()
  const [activeTab, setActiveTab] = useState<AppTab>('private')
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const pointerStartX = useRef<number | null>(null)

const goToTab = (tab: AppTab) => {
  setActiveTab(tab)
}

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    pointerStartX.current = event.clientX
  }

  const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
    if (pointerStartX.current === null) return

    const deltaX = event.clientX - pointerStartX.current
    pointerStartX.current = null

    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return

    const currentIndex = TABS.indexOf(activeTab)
    if (deltaX < 0 && currentIndex < TABS.length - 1) {
      setActiveTab(TABS[currentIndex + 1])
    }
    if (deltaX > 0 && currentIndex > 0) {
      setActiveTab(TABS[currentIndex - 1])
    }
  }

  if (phase === 'splash') {
    return <SplashScreen onFinished={() => setPhase('auth')} />
  }

  if (phase === 'auth') {
    return (
      <AuthPage
        onAuthenticated={() => setPhase('setup')}
        onBack={() => setPhase('splash')}
      />
    )
  }

  if (phase === 'setup') {
    return (
      <InitialSetup
        onComplete={() => setPhase('app')}
        onBack={() => setPhase('auth')}
      />
    )
  }

  return (
    <div className="app-shell">
      <Header onOpenProfile={() => setIsProfileOpen(true)} />

      <main
  className="app-shell__main"
  onPointerDown={handlePointerDown}
  onPointerUp={handlePointerUp}
  onPointerCancel={() => {
    pointerStartX.current = null
  }}
>
  <div
    className="page-slider"
    style={{
      transform: `translateX(-${TABS.indexOf(activeTab) * 50}%)`,
    }}
  >
    <div className="page-slider__page">
      <PrivateCalendarPage />
    </div>

    <div className="page-slider__page">
      <EventMainPage />
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

export default App
