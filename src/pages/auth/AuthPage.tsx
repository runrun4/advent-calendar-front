import { useState, type FormEvent } from 'react'
import { loginWithEmailPassword } from '../../services/authService'
import { getMe, mergeMeIntoUser } from '../../services/userApi'
import type { User } from '../../types/user'
import './AuthPage.css'

type AuthPageProps = {
  onAuthenticated?: (user: User) => void
  onGoRegister?: () => void
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function AuthPage({ onAuthenticated, onGoRegister }: AuthPageProps) {
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
      : null

    setEmailError(nextEmailError)
    setPasswordError(nextPasswordError)

    if (nextEmailError || nextPasswordError) return

    setIsSubmitting(true)

    try {
      const authUser = await loginWithEmailPassword(email, password)
      let nextUser = authUser
      try {
        const me = await getMe()
        nextUser = mergeMeIntoUser(authUser, me)
      } catch (error) {
        // ログイン自体は成功しているので、プロフィール取得失敗でも進める
        console.error('GET /v1/me failed', error)
      }
      onAuthenticated?.(nextUser)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'ログインに失敗しました'
      setFormError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <main className="auth-page__main">
        <form className="auth-page__form" onSubmit={handleSubmit} noValidate>
          <h1 className="auth-page__title">
            るんるんする準備は
            <br />
            できていますか？
          </h1>

          <div className="auth-page__fields">
            <div className="auth-page__field">
              <label className="auth-page__sr-only" htmlFor="login-email">
                メールアドレス
              </label>
              <input
                id="login-email"
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
              <label className="auth-page__sr-only" htmlFor="login-password">
                パスワード
              </label>
              <input
                id="login-password"
                className="auth-page__input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setPasswordError(null)
                  setFormError(null)
                }}
                placeholder="パスワード"
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
            {isSubmitting ? 'ログイン中…' : 'ログイン →'}
          </button>

          <button
            type="button"
            className="auth-page__link"
            onClick={onGoRegister}
            disabled={isSubmitting}
          >
            新規作成はこちら
          </button>
        </form>
      </main>
    </div>
  )
}
