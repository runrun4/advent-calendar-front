import { useEffect, useState } from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { User } from '../types/user'
import {
  getCurrentUser,
  getSession,
  mapUser,
} from '../services/authService'
import { supabase } from '../services/supabase'

export type AuthPhase = 'splash' | 'auth' | 'setup' | 'app'

function phaseFromUser(user: User | null): AuthPhase {
  if (!user) return 'auth'
  if (!user.isSetupComplete) return 'setup'
  return 'app'
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [phase, setPhase] = useState<AuthPhase>('splash')
  const [isLoading, setIsLoading] = useState(true)
  const [isBootstrapped, setIsBootstrapped] = useState(false)

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      try {
        const session = await getSession()
        if (cancelled) return

        if (session?.user) {
          const current = await getCurrentUser()
          if (cancelled) return
          setUser(current)
          setPhase(phaseFromUser(current))
        } else {
          setUser(null)
          setPhase('splash')
        }
      } catch {
        if (!cancelled) {
          setUser(null)
          setPhase('splash')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
          setIsBootstrapped(true)
        }
      }
    }

    void bootstrap()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (!session?.user) {
          setUser(null)
          return
        }
        setUser(mapUser(session.user))
      },
    )

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    setUser,
    phase,
    setPhase,
    isLoading,
    setIsLoading,
    isBootstrapped,
  }
}
