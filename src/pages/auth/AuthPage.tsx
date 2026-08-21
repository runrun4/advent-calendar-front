import { useState, type FormEvent } from 'react'
import {
  loginWithEmailPassword,
  loginWithPasskey,
} from '../../services/authService'
import type { User } from '../../types/user'
import './AuthPage.css'

type AuthPageProps = {
  onAuthenticated?: (user: User) => void
  onGoRegister?: () => void
}

export function AuthPage({ onAuthenticated, onGoRegister }: AuthPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const runAuth = async (action: () => Promise<User>) => {
    setErrorMessage(null)
    setIsSubmitting(true)
    try {
      const user = await action()
      onAuthenticated?.(user)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'ログインに失敗しました'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePasswordLogin = (event: FormEvent) => {
    event.preventDefault()
    void runAuth(() => loginWithEmailPassword(email, password))
  }

  const handlePasskeyLogin = () => {
    void runAuth(() => loginWithPasskey())
  }

  return (
    <div className="auth-page">
      <main className="auth-page__main">
        <form className="auth-page__form" onSubmit={handlePasswordLogin}>
          <h1 className="auth-page__title">ログイン</h1>

          {errorMessage ? (
            <p className="auth-page__error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className="auth-page__field">
            <label className="auth-page__label" htmlFor="login-email">
              メールアドレス
            </label>
            <input
              id="login-email"
              className="auth-page__input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
            />
          </div>

          <div className="auth-page__field">
            <label className="auth-page__label" htmlFor="login-password">
              パスワード
            </label>
            <input
              id="login-password"
              className="auth-page__input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
            />
          </div>

          <button
            type="submit"
            className="auth-page__submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'ログイン中…' : 'ログイン'}
          </button>

          <button
            type="button"
            className="auth-page__secondary"
            onClick={handlePasskeyLogin}
            disabled={isSubmitting}
          >
            パスキーでログイン
          </button>

          <hr className="auth-page__divider" />

          <button
            type="button"
            className="auth-page__link"
            onClick={onGoRegister}
            disabled={isSubmitting}
          >
            新規登録はこちら
          </button>
        </form>
      </main>
    </div>
  )
}
