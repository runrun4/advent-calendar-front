import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { AppHome } from './pages/app/AppHome'
import { AuthFlow, type AuthView } from './pages/auth/AuthFlow'

function App() {
  const { user, setUser, phase, setPhase, isBootstrapped } = useAuth()
  const [authView, setAuthView] = useState<AuthView>('login')

  if (!isBootstrapped) {
    return null
  }

  if (phase !== 'app') {
    return (
      <AuthFlow
        phase={phase}
        authView={authView}
        setPhase={setPhase}
        setAuthView={setAuthView}
        setUser={setUser}
      />
    )
  }

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
