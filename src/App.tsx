import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { AppHome } from './pages/app/AppHome'
import { AuthFlow, type AuthView } from './pages/auth/AuthFlow'

function App() {
  const { user, phase, setPhase } = useAuth()
  const [authView, setAuthView] = useState<AuthView>('login')

  if (phase !== 'app') {
    return (
      <AuthFlow
        phase={phase}
        authView={authView}
        setPhase={setPhase}
        setAuthView={setAuthView}
      />
    )
  }

  return <AppHome user={user} />
}

export default App
