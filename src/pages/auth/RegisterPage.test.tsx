import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authMock, resetAuthMock } from '../../test/supabaseMock'
import { RegisterPage } from './RegisterPage'

vi.mock('../../services/supabase', async () => {
  return (await import('../../test/supabaseMock')).supabaseModule
})

async function register(onRegistered = vi.fn()) {
  const user = userEvent.setup()
  render(<RegisterPage onRegistered={onRegistered} />)
  await user.type(screen.getByLabelText('メールアドレス'), 'new@example.com')
  await user.type(screen.getByLabelText('パスワード'), 'password1')
  await user.click(screen.getByRole('button', { name: '新規作成 →' }))
  return { user, onRegistered }
}

describe('RegisterPage', () => {
  beforeEach(() => resetAuthMock())

  it('確認メールが有効(session=null)なら確認画面と再送ボタンを出す', async () => {
    authMock.signUp.mockResolvedValue({
      data: { user: { id: 'u1' }, session: null },
      error: null,
    })
    authMock.resend.mockResolvedValue({ data: {}, error: null })
    const { user, onRegistered } = await register()

    expect(
      await screen.findByRole('heading', { name: /確認メールを\s*送りました/ }),
    ).toBeInTheDocument()
    expect(screen.getByText(/メール内のリンクを開いてください/)).toBeInTheDocument()
    expect(screen.queryByText(/Supabase/)).not.toBeInTheDocument()
    expect(onRegistered).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '確認メールを再送' }))
    expect(authMock.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'new@example.com',
    })
    expect(await screen.findByText('確認メールを再送しました。')).toBeInTheDocument()
  })

  it('確認メールが無効(session あり)なら従来どおり即ログインする', async () => {
    authMock.signUp.mockResolvedValue({
      data: { user: { id: 'u1', email: 'new@example.com' }, session: { access_token: 't' } },
      error: null,
    })
    const { onRegistered } = await register()

    await vi.waitFor(() => expect(onRegistered).toHaveBeenCalledTimes(1))
    expect(
      screen.queryByRole('heading', { name: /確認メールを/ }),
    ).not.toBeInTheDocument()
  })

  it('弱いパスワードは日本語で表示する', async () => {
    authMock.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'weak', code: 'weak_password' },
    })
    await register()

    expect(await screen.findByRole('alert')).toHaveTextContent('推測されやすい')
  })
})
