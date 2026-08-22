import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { AppHome } from './pages/app/AppHome'
import { AuthFlow, type AuthView } from './pages/auth/AuthFlow'
import { SplashScreen } from './pages/auth/SplashScreen'

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
    return (
      <SplashScreen
        onLoadingComplete={() => {
          console.log('SplashScreen終了')

          setShowSplash(false)
        }}
        onWebContinue={() => {
          console.log('Webのまま進みます')

          setShowSplash(false)
        }}
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
      onLoggedOut={() => {
        setUser(null)
        setAuthView('login')
        setPhase('auth')
      }}
    />
  )
}

export default App