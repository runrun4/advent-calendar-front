import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authMock, resetAuthMock } from '../../test/supabaseMock'
import { ResetPasswordPage } from './ResetPasswordPage'

vi.mock('../../services/supabase', async () => {
  return (await import('../../test/supabaseMock')).supabaseModule
})
vi.mock('../../services/userApi', () => ({
  getMe: vi.fn().mockRejectedValue(new Error('no backend in test')),
  mergeMeIntoUser: vi.fn(),
}))

const recoverySession = { user: { id: 'u1' } }

async function fill(password: string, confirm: string) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('新しいパスワード'), password)
  await user.type(screen.getByLabelText('新しいパスワード(確認)'), confirm)
  await user.click(screen.getByRole('button', { name: /パスワードを更新/ }))
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    resetAuthMock()
    authMock.getSession.mockResolvedValue({
      data: { session: recoverySession },
      error: null,
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('2つのパスワードが一致しなければ更新しない', async () => {
    render(<ResetPasswordPage />)
    await fill('password1', 'password2')

    expect(screen.getByRole('alert')).toHaveTextContent('一致しません')
    expect(authMock.updateUser).not.toHaveBeenCalled()
  })

  it('更新に成功したら onCompleted を呼ぶ', async () => {
    authMock.updateUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@example.com', user_metadata: { is_setup_complete: true } } },
      error: null,
    })
    const onCompleted = vi.fn()
    render(<ResetPasswordPage onCompleted={onCompleted} />)
    await fill('password1', 'password1')

    await vi.waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1))
    expect(authMock.updateUser).toHaveBeenCalledWith({ password: 'password1' })
    expect(onCompleted.mock.calls[0][0]).toMatchObject({ id: 'u1' })
  })

  it('更新に失敗したら日本語のエラーを表示し onCompleted は呼ばない', async () => {
    authMock.updateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Password is known to be weak', code: 'weak_password' },
    })
    const onCompleted = vi.fn()
    render(<ResetPasswordPage onCompleted={onCompleted} />)
    await fill('password1', 'password1')

    expect(await screen.findByRole('alert')).toHaveTextContent('推測されやすい')
    expect(onCompleted).not.toHaveBeenCalled()
  })

  it('リカバリーセッションがなければ再送導線を出す', async () => {
    authMock.getSession.mockResolvedValue({ data: { session: null }, error: null })
    const onRequestNewLink = vi.fn()
    const user = userEvent.setup()
    render(<ResetPasswordPage onRequestNewLink={onRequestNewLink} />)

    expect(await screen.findByText(/有効期限が切れている/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'メールを再送する' }))
    expect(onRequestNewLink).toHaveBeenCalled()
  })
})
