import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { AppHome } from './pages/app/AppHome'
import {
  AuthFlow,
  type AuthView,
} from './pages/auth/AuthFlow'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'
import { SplashScreen } from './pages/auth/SplashScreen'
import {
  isRecoveryRoute,
  leaveRecoveryRoute,
} from './services/recoveryLink'

function App() {
  const {
    user,
    setUser,
    phase,
    setPhase,
    isBootstrapped,
  } = useAuth()

  const [authView, setAuthView] =
    useState<AuthView>('login')

  const [showSplash, setShowSplash] =
    useState(true)

  // パスワード再設定メールのリンクから開かれた場合
  const [isRecovering, setIsRecovering] = useState(isRecoveryRoute)

  if (!isBootstrapped) {
    return null
  }

  // ================================
  // パスワード再設定(/auth/reset-password)
  // スプラッシュを挟まず、そのまま新パスワード入力へ
  // ================================
  if (isRecovering) {
    const leave = () => {
      leaveRecoveryRoute()
      setIsRecovering(false)
      setShowSplash(false)
    }
    return (
      <ResetPasswordPage
        onCompleted={(nextUser) => {
          setUser(nextUser)
          setAuthView('login')
          setPhase(nextUser.isSetupComplete ? 'app' : 'setup')
          leave()
        }}
        onRequestNewLink={() => {
          setAuthView('forgot')
          setPhase('auth')
          leave()
        }}
        onGoLogin={() => {
          setAuthView('login')
          setPhase('auth')
          leave()
        }}
      />
    )
  }

  // ================================
  // SplashScreen
  // ================================
  if (showSplash) {
    const finishSplash = () => {
      setShowSplash(false)

      // PWAは2秒後 / Webはボタン。
      // どちらもログイン済みならアプリへ
      setPhase(
        user ? 'app' : 'auth',
      )
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
      onLoggedOut={() => {
        setUser(null)
        setAuthView('login')
        setPhase('auth')
      }}
    />
  )
}

export default App
