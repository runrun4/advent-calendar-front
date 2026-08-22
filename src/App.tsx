import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { AppHome } from './pages/app/AppHome'
import { AuthFlow, type AuthView } from './pages/auth/AuthFlow'
import { SplashScreen } from './pages/auth/SplashScreen'

function App() {
  const { user, setUser, phase, setPhase, isBootstrapped } = useAuth()

  const [authView, setAuthView] = useState<AuthView>('login')
  const [showSplash, setShowSplash] = useState(true)

  // イベント画面からPWA促進画面を開くためのstate
  const [showPwaGuide, setShowPwaGuide] = useState(false)

  if (!isBootstrapped) {
    return null
  }

  // ================================
  // イベント画面からPWA促進画面を開く
  // ================================
  if (showPwaGuide) {
    return (
      <SplashScreen
        showPwaGuide
        onLoadingComplete={() => {
          setShowPwaGuide(false)
        }}
        onWebContinue={() => {
          setShowPwaGuide(false)
        }}
      />
    )
  }

  // ================================
  // 初回SplashScreen
  // ================================
  if (showSplash) {
    const finishSplash = () => {
      setShowSplash(false)

      // PWAは2秒後 / Webはボタン。
      // どちらもログイン済みならアプリへ
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
    <AppHome
      user={user}
      onUserUpdated={setUser}
      onOpenPwaGuide={() => {
        setShowPwaGuide(true)
      }}
      onLoggedOut={() => {
        setUser(null)
        setAuthView('login')
        setPhase('auth')
      }}
    />
  )
}

export default App