import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { AppHome } from './pages/app/AppHome'
import { AuthFlow, type AuthView } from './pages/auth/AuthFlow'
import { SplashScreen } from './pages/auth/SplashScreen'
import { NotificationPermissionButton } from './components/NotificationPermissionButton'

function App() {
  const { user, setUser, phase, setPhase, isBootstrapped } = useAuth()

  const [authView, setAuthView] = useState<AuthView>('login')
  const [showSplash, setShowSplash] = useState(true)

  if (!isBootstrapped) {
    return null
  }

  // ================================
  // SplashScreen
  // ================================
  if (showSplash) {
    const finishSplash = () => {
      setShowSplash(false)
      // PWAは2秒後 / Webはボタン。どちらもログイン済みならアプリへ
      setPhase(user ? 'app' : 'auth')
    }

    return (
      <SplashScreen
        onLoadingComplete={finishSplash}
        onWebContinue={finishSplash}
      />
    )
  }

  // ================================
  // 認証画面
  // ================================
  if (phase !== 'app') {
    return (
      <AuthFlow
        phase={phase}
        authView={authView}
        user={user}
        setPhase={setPhase}
        setAuthView={setAuthView}
        setUser={setUser}
      />
    )
  }

  // ================================
  // アプリ本体
  // ================================
  return (
    <>
      <NotificationPermissionButton />

      <AppHome
        user={user}
        onUserUpdated={setUser}
        onLoggedOut={() => {
          setUser(null)
          setAuthView('login')
          setPhase('auth')
        }}
      />
    </>
  )
}

export default App