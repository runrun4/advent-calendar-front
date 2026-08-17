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
    <div className="auth-page">
      <main className="auth-page__main">
        <form className="auth-page__form" onSubmit={handleSubmit}>
          <h1 className="auth-page__title">新規登録</h1>

          <div className="auth-page__field">
            <label className="auth-page__label" htmlFor="register-email">
              メールアドレス
            </label>
            <input
              id="register-email"
              className="auth-page__input"
              type="email"
              autoComplete="email"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
            />
          </div>

          <button type="submit" className="auth-page__submit">
            登録する
          </button>

          <hr className="auth-page__divider" />

          <button type="button" className="auth-page__link" onClick={onGoLogin}>
            ログインはこちら
          </button>
        </form>
      </main>
    </div>
  )
}
