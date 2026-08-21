import { useState, type FormEvent } from 'react'
import { registerWithEmailPassword } from '../../services/authService'
import type { User } from '../../types/user'
import './AuthPage.css'

type RegisterPageProps = {
  onRegistered?: (user: User) => void
  onGoLogin?: () => void
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function RegisterPage({ onRegistered, onGoLogin }: RegisterPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    const nextEmailError = !email.trim()
      ? 'このフィールドに入力してください'
      : !isValidEmail(email.trim())
        ? '有効なメールアドレスを入力してください'
        : null
    const nextPasswordError = !password
      ? 'このフィールドに入力してください'
      : password.length < 6
        ? 'パスワードは6文字以上にしてください'
        : null

    setEmailError(nextEmailError)
    setPasswordError(nextPasswordError)

    if (nextEmailError || nextPasswordError) return

    setIsSubmitting(true)

    try {
      const user = await registerWithEmailPassword(email, password)
      onRegistered?.(user)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '新規作成に失敗しました'
      setFormError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page auth-page--register">
      <main className="auth-page__main">
        <form className="auth-page__form" onSubmit={handleSubmit} noValidate>
          <h1 className="auth-page__title">
            いっしょに
            <br />
            るんるんしましょう！
          </h1>

          <div className="auth-page__fields">
            <div className="auth-page__field">
              <label className="auth-page__sr-only" htmlFor="register-email">
                メールアドレス
              </label>
              <input
                id="register-email"
                className="auth-page__input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setEmailError(null)
                  setFormError(null)
                }}
                placeholder="メールアドレス"
                aria-invalid={emailError != null}
              />
              {emailError ? (
                <p className="auth-page__field-error" role="alert">
                  {emailError}
                </p>
              ) : null}
            </div>

            <div className="auth-page__field">
              <label className="auth-page__sr-only" htmlFor="register-password">
                パスワード
              </label>
              <input
                id="register-password"
                className="auth-page__input"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setPasswordError(null)
                  setFormError(null)
                }}
                placeholder="パスワード(6文字以上)"
                aria-invalid={passwordError != null}
              />
              {passwordError ? (
                <p className="auth-page__field-error" role="alert">
                  {passwordError}
                </p>
              ) : null}
              {formError ? (
                <p className="auth-page__field-error" role="alert">
                  {formError}
                </p>
              ) : null}
            </div>
          </div>

          <button
            type="submit"
            className="auth-page__submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? '作成中…' : '新規作成 →'}
          </button>

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
