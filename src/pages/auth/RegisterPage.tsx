import { useState, type FormEvent } from 'react'
import {
  registerPasskeyForCurrentUser,
  sendRegisterOtp,
  verifyRegisterOtp,
} from '../../services/authService'
import type { User } from '../../types/user'
import './AuthPage.css'

type RegisterStep = 'email' | 'otp' | 'passkey'

type RegisterPageProps = {
  onRegistered?: (user: User) => void
  onGoLogin?: () => void
}

export function RegisterPage({ onRegistered, onGoLogin }: RegisterPageProps) {
  const [step, setStep] = useState<RegisterStep>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSendOtp = async (event: FormEvent) => {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      await sendRegisterOtp(email)
      setStep('otp')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '認証コードの送信に失敗しました'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const verifiedUser = await verifyRegisterOtp(email, otp)
      setUser(verifiedUser)
      setStep('passkey')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '認証コードの確認に失敗しました'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegisterPasskey = async (event: FormEvent) => {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      await registerPasskeyForCurrentUser()
      if (user) onRegistered?.(user)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'パスキー登録に失敗しました'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <main className="auth-page__main">
        {step === 'email' ? (
          <form className="auth-page__form" onSubmit={handleSendOtp}>
            <h1 className="auth-page__title">新規登録</h1>
            <p className="auth-page__hint">
              メールで認証コードを送り、その後パスキーを登録します
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

            <button
              type="submit"
              className="auth-page__submit"
              disabled={isSubmitting || !email.trim()}
            >
              {isSubmitting ? '送信中…' : '認証コードを送る'}
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
        ) : null}

        {step === 'otp' ? (
          <form className="auth-page__form" onSubmit={handleVerifyOtp}>
            <h1 className="auth-page__title">認証コード</h1>
            <p className="auth-page__hint">{email} に送ったコードを入力してください</p>

            {errorMessage ? (
              <p className="auth-page__error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <div className="auth-page__field">
              <label className="auth-page__label" htmlFor="register-otp">
                認証コード
              </label>
              <input
                id="register-otp"
                className="auth-page__input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6桁のコード"
              />
            </div>

            <button
              type="submit"
              className="auth-page__submit"
              disabled={isSubmitting || !otp.trim()}
            >
              {isSubmitting ? '確認中…' : 'コードを確認'}
            </button>

            <button
              type="button"
              className="auth-page__link"
              onClick={() => {
                setStep('email')
                setOtp('')
                setErrorMessage(null)
              }}
              disabled={isSubmitting}
            >
              メールアドレスをやり直す
            </button>
          </form>
        ) : null}

        {step === 'passkey' ? (
          <form className="auth-page__form" onSubmit={handleRegisterPasskey}>
            <h1 className="auth-page__title">パスキー登録</h1>
            <p className="auth-page__hint">
              Face ID / Touch ID / Windows Hello などでパスキーを登録します
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
              {isSubmitting ? '登録中…' : 'パスキーを登録する'}
            </button>
          </form>
        ) : null}
      </main>
    </div>
  )
}
