import type { AuthPhase } from '../../hooks/useAuth'
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
}

export function AuthFlow({
  phase,
  authView,
  setPhase,
  setAuthView,
}: AuthFlowProps) {
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

  return null
}
