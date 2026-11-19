import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authMock, resetAuthMock } from './test/supabaseMock'
import { captureRecoveryLinkFromUrl } from './services/recoveryLink'
import App from './App'

vi.mock('./services/supabase', async () => {
  return (await import('./test/supabaseMock')).supabaseModule
})
vi.mock('./pages/app/AppHome', () => ({ AppHome: () => <div>app-home</div> }))

describe('App: /auth/reset-password への直接アクセス', () => {
  beforeEach(() => resetAuthMock())
  afterEach(() => {
    window.history.replaceState(null, '', '/')
    captureRecoveryLinkFromUrl()
  })

  it('スプラッシュを挟まず新パスワード入力を表示する', async () => {
    window.history.replaceState(null, '', '/auth/reset-password#access_token=x&type=recovery')
    captureRecoveryLinkFromUrl()
    authMock.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
      error: null,
    })
    authMock.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    render(<App />)

    expect(await screen.findByLabelText('新しいパスワード')).toBeInTheDocument()
  })

  it('リンクが期限切れ(ハッシュに error)なら再送導線を表示する', async () => {
    window.history.replaceState(
      null,
      '',
      '/auth/reset-password#error=access_denied&error_code=otp_expired',
    )
    captureRecoveryLinkFromUrl()

    render(<App />)

    expect(await screen.findByRole('button', { name: 'メールを再送する' })).toBeInTheDocument()
  })
})
