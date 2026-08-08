import { useState } from 'react'
import type { User } from '../types/user'

export type AuthPhase = 'splash' | 'auth' | 'setup' | 'app'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [phase, setPhase] = useState<AuthPhase>('splash')
  const [isLoading, setIsLoading] = useState(false)

  return {
    user,
    setUser,
    phase,
    setPhase,
    isLoading,
    setIsLoading,
  }
}
