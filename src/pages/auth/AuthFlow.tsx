import type { AuthPhase } from '../../hooks/useAuth'
import type { User } from '../../types/user'
import { completeInitialSetup } from '../../services/authService'
import { AuthPage } from './AuthPage'
import { InitialSetup } from './InitialSetup'
import { RegisterPage } from './RegisterPage'
import { SplashScreen } from './SplashScreen'

export type AuthView = 'login' | 'register'

type AuthFlowProps = {
  phase: AuthPhase
  authView: AuthView
  user: User | null
  setPhase: (phase: AuthPhase) => void
  setAuthView: (view: AuthView) => void
  setUser: (user: User | null) => void
}

export function AuthFlow({
  phase,
  authView,
  user,
  setPhase,
  setAuthView,
  setUser,
}: AuthFlowProps) {
  if (phase === 'splash') {
    return (
      <SplashScreen
        onFinished={() => {
          // ログイン済み → イベント画面 / 未ログイン → 認証画面
          setPhase(user ? 'app' : 'auth')
        }}
      />
    )
  }

  if (phase === 'auth' && authView === 'login') {
    return (
      <AuthPage
        onAuthenticated={(nextUser) => {
          setUser(nextUser)
          setPhase('app')
        }}
        onGoRegister={() => setAuthView('register')}
      />
    )
  }

  if (phase === 'auth' && authView === 'register') {
    return (
      <RegisterPage
        onRegistered={(nextUser) => {
          setUser(nextUser)
          setPhase('setup')
        }}
        onGoLogin={() => setAuthView('login')}
      />
    )
  }

  if (phase === 'setup') {
    return (
      <InitialSetup
        onComplete={(nickname) => {
          void (async () => {
            try {
              const updated = await completeInitialSetup(nickname)
              setUser(updated)
            } catch {
              // メタデータ更新に失敗してもイベント画面へは進める
            }
            setPhase('app')
          })()
        }}
      />
    )
  }

  return null
}
