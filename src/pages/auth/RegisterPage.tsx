import { useState, type FormEvent } from 'react'
import './AuthPage.css'

type RegisterPageProps = {
  onRegistered?: () => void
  onGoLogin?: () => void
}

export function RegisterPage({ onRegistered, onGoLogin }: RegisterPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onRegistered?.()
  }

  return (
    <div className="auth-page auth-page--register">
      <main className="auth-page__main">
        <form className="auth-page__form" onSubmit={handleSubmit}>
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
                onChange={(e) => setEmail(e.target.value)}
                placeholder="メールアドレス"
              />
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
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード"
              />
            </div>
          </div>

          <button type="submit" className="auth-page__submit">
            新規登録 →
          </button>

          <button type="button" className="auth-page__link" onClick={onGoLogin}>
            ログインはこちら
          </button>
        </form>
      </main>
    </div>
  )
}
