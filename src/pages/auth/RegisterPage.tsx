import { useState, type FormEvent } from 'react'
import { registerWithEmailPassword } from '../../services/authService'
import type { User } from '../../types/user'
import './AuthPage.css'

type RegisterPageProps = {
  onRegistered?: (user: User) => void
  onGoLogin?: () => void
}

export function RegisterPage({ onRegistered, onGoLogin }: RegisterPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const { user } = await registerWithEmailPassword(email, password)
      // パスキーの成否に関わらず登録完了として進む
      onRegistered?.(user)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '新規登録に失敗しました'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <main className="auth-page__main">
        <form className="auth-page__form" onSubmit={handleSubmit}>
          <h1 className="auth-page__title">新規登録</h1>

          <p className="auth-page__hint">
            メールとパスワードで登録します。使える場合はパスキーも自動で追加します
          </p>

          {errorMessage ? (
            <p className="auth-page__error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className="auth-page__field">
            <label className="auth-page__label" htmlFor="register-email">
              メールアドレス
            </label>
            <input
              id="register-email"
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
            <label className="auth-page__label" htmlFor="register-password">
              パスワード
            </label>
            <input
              id="register-password"
              className="auth-page__input"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6文字以上"
            />
          </div>

          <button
            type="submit"
            className="auth-page__submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? '登録中…' : '登録する'}
          </button>

          <hr className="auth-page__divider" />

          <button
            type="button"
            className="auth-page__link"
            onClick={onGoLogin}
            disabled={isSubmitting}
          >
            ログインはこちら
          </button>
        </form>
      </main>
    </div>
  )
}
