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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [phase, setPhase] = useState<AuthPhase>('splash')
  const [isLoading, setIsLoading] = useState(true)
  const [isBootstrapped, setIsBootstrapped] = useState(false)

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      console.log('[AUTH] bootstrap start')

      try {
        console.log('[AUTH] getSession start')

        const session = await getSession()

        console.log('[AUTH] getSession complete', session)

        if (cancelled) return

        if (session?.user) {
          console.log('[AUTH] getCurrentUser start')

          const current = await getCurrentUser()

          console.log('[AUTH] getCurrentUser complete', current)

          if (cancelled) return

          setUser(current)
        } else {
          console.log('[AUTH] no session')
          setUser(null)
        }

        console.log('[AUTH] set phase splash')

        setPhase('splash')
      } catch (error) {
        console.error('[AUTH] bootstrap error', error)

        if (!cancelled) {
          setUser(null)
          setPhase('splash')
        }
      } finally {
        console.log('[AUTH] bootstrap finally')

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
        console.log('[AUTH] auth state changed', _event)

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