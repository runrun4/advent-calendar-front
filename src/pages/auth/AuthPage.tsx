import { useState, type FormEvent } from 'react'
import { loginWithPasskey } from '../../services/authService'
import type { User } from '../../types/user'
import './AuthPage.css'

type AuthPageProps = {
  onAuthenticated?: (user: User) => void
  onGoRegister?: () => void
}

export function AuthPage({ onAuthenticated, onGoRegister }: AuthPageProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const user = await loginWithPasskey()
      onAuthenticated?.(user)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'ログインに失敗しました'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <main className="auth-page__main">
        <form className="auth-page__form" onSubmit={handleSubmit}>
          <h1 className="auth-page__title">ログイン</h1>

          <p className="auth-page__hint">
            登録済みのパスキー（生体認証）でログインします
          </p>

          {errorMessage ? (
            <p className="auth-page__error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            className="auth-page__submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? '認証中…' : 'パスキーでログイン'}
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
