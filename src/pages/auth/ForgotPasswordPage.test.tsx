import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authMock, resetAuthMock } from '../../test/supabaseMock'
import { ForgotPasswordPage } from './ForgotPasswordPage'

vi.mock('../../services/supabase', async () => {
  return (await import('../../test/supabaseMock')).supabaseModule
})

async function submit(email: string) {
  const user = userEvent.setup()
  const view = render(<ForgotPasswordPage />)
  await user.type(screen.getByLabelText('メールアドレス'), email)
  await user.click(screen.getByRole('button', { name: 'メールを送る →' }))
  const text = await screen.findByRole('status')
  return { text: text.textContent, view }
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    resetAuthMock()
    authMock.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
  })

  it('登録の有無に関わらず同じ文言を表示する', async () => {
    const first = await submit('registered@example.com')
    first.view.unmount()
    // 未登録でも Supabase は同じ成功応答を返す
    const second = await submit('nobody@example.com')

    expect(first.text).toContain('メールを送りました')
    expect(second.text).toBe(first.text)
  })

  it('アプリの /auth/reset-password へ戻る redirectTo を渡す', async () => {
    await submit('a@example.com')

    expect(authMock.resetPasswordForEmail).toHaveBeenCalledWith(
      'a@example.com',
      { redirectTo: `${window.location.origin}/auth/reset-password` },
    )
  })

  it('送信後は再送ボタンが無効になる(連打防止)', async () => {
    await submit('a@example.com')

    expect(screen.getByRole('button', { name: /再送まで/ })).toBeDisabled()
    expect(authMock.resetPasswordForEmail).toHaveBeenCalledTimes(1)
  })

  it('メール形式が不正なら送信しない', async () => {
    const user = userEvent.setup()
    render(<ForgotPasswordPage />)
    await user.type(screen.getByLabelText('メールアドレス'), 'bad')
    await user.click(screen.getByRole('button', { name: 'メールを送る →' }))

    expect(screen.getByRole('alert')).toHaveTextContent('有効なメールアドレス')
    expect(authMock.resetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('レート制限は日本語で表示する', async () => {
    authMock.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { message: 'email rate limit exceeded', code: 'over_email_send_rate_limit' },
    })
    const user = userEvent.setup()
    render(<ForgotPasswordPage />)
    await user.type(screen.getByLabelText('メールアドレス'), 'a@example.com')
    await user.click(screen.getByRole('button', { name: 'メールを送る →' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('上限')
  })
})
