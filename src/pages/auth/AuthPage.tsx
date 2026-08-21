import { useState, type FormEvent } from 'react'
import './AuthPage.css'

type AuthPageProps = {
  onAuthenticated?: () => void
  onGoRegister?: () => void
}

export function AuthPage({ onAuthenticated, onGoRegister }: AuthPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onAuthenticated?.()
  }

  return (
    <div className="auth-page">
      <main className="auth-page__main">
        <form className="auth-page__form" onSubmit={handleSubmit}>
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
                onChange={(e) => setEmail(e.target.value)}
                placeholder="メールアドレス"
              />
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
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード"
              />
            </div>
          </div>

          <button type="submit" className="auth-page__submit">
            ログイン →
          </button>

          <button
            type="button"
            className="auth-page__link"
            onClick={onGoRegister}
          >
            新規登録はこちら
          </button>
        </form>
      </main>
    </div>
  )
}
