import { vi } from 'vitest'

/**
 * Supabase クライアントのモック。vi.mock の factory から使う。
 * `vi.mock('../../services/supabase', async () => (await import('../../test/supabaseMock')).supabaseModule)`
 */
export const authMock = {
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  resend: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  getSession: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
}

export const supabaseModule = { supabase: { auth: authMock } }

export function resetAuthMock() {
  for (const fn of Object.values(authMock)) fn.mockReset()
  authMock.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  })
  authMock.getSession.mockResolvedValue({ data: { session: null }, error: null })
}
