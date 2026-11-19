import { useEffect, useState, type FormEvent } from 'react'
import { toAuthErrorMessage } from '../../services/authErrors'
import { requestPasswordReset } from '../../services/authService'
import './AuthPage.css'

type ForgotPasswordPageProps = {
  onGoLogin?: () => void
}

/** 再送できるようになるまでの秒数(連打・メール爆撃の防止) */
const RESEND_COOLDOWN_SECONDS = 60

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function ForgotPasswordPage({ onGoLogin }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSent, setIsSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting || cooldown > 0) return
    setFormError(null)

    const nextEmailError = !email.trim()
      ? 'このフィールドに入力してください'
      : !isValidEmail(email.trim())
        ? '有効なメールアドレスを入力してください'
        : null
    setEmailError(nextEmailError)
    if (nextEmailError) return

    setIsSubmitting(true)
    try {
      await requestPasswordReset(email)
      // 登録の有無に関わらず同じ表示にする(アカウントの存在を漏らさない)
      setIsSent(true)
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (error) {
      setFormError(toAuthErrorMessage(error, 'メールの送信に失敗しました'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <main className="auth-page__main">
        <form className="auth-page__form" onSubmit={handleSubmit} noValidate>
          <h1 className="auth-page__title">
            パスワードの
            <br />
            再設定
          </h1>

          {isSent ? (
            <p className="auth-page__message" role="status">
              メールを送りました。登録されているメールアドレスの場合、パスワード再設定用のリンクが届きます。
              届かないときは迷惑メールフォルダもご確認ください。
            </p>
          ) : (
            <p className="auth-page__message">
              登録したメールアドレスを入力してください。再設定用のリンクをお送りします。
            </p>
          )}

          <div className="auth-page__fields">
            <div className="auth-page__field">
              <label className="auth-page__sr-only" htmlFor="forgot-email">
                メールアドレス
              </label>
              <input
                id="forgot-email"
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
            disabled={isSubmitting || cooldown > 0}
          >
            {isSubmitting
              ? '送信中…'
              : cooldown > 0
                ? `再送まで ${cooldown} 秒`
                : isSent
                  ? 'もう一度送る'
                  : 'メールを送る →'}
          </button>

          <button
            type="button"
            className="auth-page__link"
            onClick={onGoLogin}
            disabled={isSubmitting}
          >
            ログインに戻る
          </button>
        </form>
      </main>
    </div>
  )
}
