import type { AuthPhase } from '../../hooks/useAuth'
import type { User } from '../../types/user'
import { AuthPage } from './AuthPage'
import { InitialSetup } from './InitialSetup'
import { RegisterPage } from './RegisterPage'
import { SplashScreen } from './SplashScreen'

export type AuthView = 'login' | 'register'

type AuthFlowProps = {
  phase: AuthPhase
  authView: AuthView
  setPhase: (phase: AuthPhase) => void
  setAuthView: (view: AuthView) => void
  setUser: (user: User | null) => void
}

export function AuthFlow({
  phase,
  authView,
  setPhase,
  setAuthView,
  setUser,
}: AuthFlowProps) {
  if (phase === 'splash') {
    return <SplashScreen onFinished={() => setPhase('auth')} />
  }

  if (phase === 'auth' && authView === 'login') {
    return (
      <AuthPage
        onAuthenticated={(user) => {
          setUser(user)
          setPhase(user.isSetupComplete ? 'app' : 'setup')
        }}
        onGoRegister={() => setAuthView('register')}
      />
    )
  }

  if (phase === 'auth' && authView === 'register') {
    return (
      <RegisterPage
        onRegistered={(user) => {
          setUser(user)
          setPhase('setup')
        }}
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

  return null
}
