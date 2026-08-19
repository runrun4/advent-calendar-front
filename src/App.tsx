import { useRef, useState, type PointerEvent } from 'react'
import { ProfileModal } from './components/profile/ProfileModal'
import { useAuth } from './hooks/useAuth'
import { AuthPage } from './pages/auth/AuthPage'
import { InitialSetup } from './pages/auth/InitialSetup'
import { RegisterPage } from './pages/auth/RegisterPage'
import { SplashScreen } from './pages/auth/SplashScreen'
import { EventMainPage } from './pages/event/EventMainPage'

import { PrivateCalendarPage } from './pages/private-calendar/PrivateCalendarPage'
type AppTab = 'private' | 'event'
const TABS: AppTab[] = ['private', 'event']
const SWIPE_THRESHOLD = 100

type AuthView = 'login' | 'register'

function App() {
  const { user, phase, setPhase } = useAuth()
  const [authView, setAuthView] = useState<AuthView>('login')
  const [activeTab, setActiveTab] = useState<AppTab>('private')
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const pointerStartX = useRef<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)



const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
  pointerStartX.current = event.clientX
  setIsDragging(true)

  event.currentTarget.setPointerCapture(event.pointerId)
}

const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
  if (pointerStartX.current === null) return

  const deltaX = event.clientX - pointerStartX.current
  const currentIndex = TABS.indexOf(activeTab)

  if (
    (currentIndex === 0 && deltaX > 0) ||
    (currentIndex === TABS.length - 1 && deltaX < 0)
  ) {
    setDragOffset(deltaX * 0.2)
    return
  }

  setDragOffset(deltaX)
}

 const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
  if (pointerStartX.current === null) return

  const deltaX = event.clientX - pointerStartX.current
  const currentIndex = TABS.indexOf(activeTab)

  pointerStartX.current = null
  setIsDragging(false)

  if (Math.abs(deltaX) < SWIPE_THRESHOLD) {
    setDragOffset(0)
    return
  }

  if (deltaX < 0 && currentIndex < TABS.length - 1) {
    setActiveTab(TABS[currentIndex + 1])
  }

  if (deltaX > 0 && currentIndex > 0) {
    setActiveTab(TABS[currentIndex - 1])
  }

  setDragOffset(0)
}

  if (phase === 'splash') {
    return <SplashScreen onFinished={() => setPhase('auth')} />
  }

  if (phase === 'auth' && authView === 'login') {
    return (
      <AuthPage
        onAuthenticated={() => setPhase('app')}
        onGoRegister={() => setAuthView('register')}
      />
    )
  }

  if (phase === 'auth' && authView === 'register') {
    return (
      <RegisterPage
        onRegistered={() => setPhase('setup')}
        onGoLogin={() => setAuthView('login')}
      />
    )
  }

  if (phase === 'setup') {
    return (
      <InitialSetup
        onComplete={() => setPhase('app')}
        onBack={() => {
          setAuthView('register')
          setPhase('auth')
        }}
      />
    )
  }

  return (
    <div className="app-shell">
      <div className="app-shell__top" aria-hidden="true" />

      <main
  className="app-shell__main"
  onPointerDown={handlePointerDown}
  onPointerMove={handlePointerMove}
  onPointerUp={handlePointerUp}
onPointerCancel={() => {
  pointerStartX.current = null
  setIsDragging(false)
  setDragOffset(0)
}}
>
<div
  className="page-slider"
  style={{
    transform: `translateX(calc(-${
      TABS.indexOf(activeTab) * 50
    }% + ${dragOffset}px))`,
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

export default App
