import { useRef, useState, type PointerEvent } from 'react'
import { Header } from './components/layout/Header'
import {
  TabNavigation,
  type AppTab,
} from './components/layout/TabNavigation'
import { ProfileModal } from './components/profile/ProfileModal'
import { useAuth } from './hooks/useAuth'
import { AuthPage } from './pages/auth/AuthPage'
import { InitialSetup } from './pages/auth/InitialSetup'
import { RegisterPage } from './pages/auth/RegisterPage'
import { SplashScreen } from './pages/auth/SplashScreen'
import { EventMainPage } from './pages/event/EventMainPage'
import { MemoriesPage } from './pages/memories/MemoriesPage'
import { PrivateCalendarPage } from './pages/private-calendar/PrivateCalendarPage'

const TABS: AppTab[] = ['private', 'event', 'memories']
const SWIPE_THRESHOLD = 56

type AuthView = 'login' | 'register'

function App() {
  const { user, phase, setPhase } = useAuth()
  const [authView, setAuthView] = useState<AuthView>('login')
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
      <Header onOpenProfile={() => setIsProfileOpen(true)} />

      <main
        className="app-shell__main"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          pointerStartX.current = null
        }}
      >
        {activeTab === 'private' ? <PrivateCalendarPage /> : null}
        {activeTab === 'event' ? <EventMainPage /> : null}
        {activeTab === 'memories' ? <MemoriesPage /> : null}
      </main>

      <TabNavigation activeTab={activeTab} onChange={goToTab} />

      <ProfileModal
        isOpen={isProfileOpen}
        user={user}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  )
}

export default App
