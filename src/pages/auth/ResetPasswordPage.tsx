import { useEffect, useState, type FormEvent } from 'react'
import { toAuthErrorMessage } from '../../services/authErrors'
import { getSession, updatePassword } from '../../services/authService'
import { hasRecoveryLinkError } from '../../services/recoveryLink'
import { supabase } from '../../services/supabase'
import { getMe, mergeMeIntoUser } from '../../services/userApi'
import type { User } from '../../types/user'
import './AuthPage.css'

type ResetPasswordPageProps = {
  /** パスワード更新に成功し、ログイン状態になった */
  onCompleted?: (user: User) => void
  /** リンクが無効なとき、再送(メール入力画面)へ進む */
  onRequestNewLink?: () => void
  onGoLogin?: () => void
}

type LinkStatus = 'checking' | 'ready' | 'invalid'

export function ResetPasswordPage({
  onCompleted,
  onRequestNewLink,
  onGoLogin,
}: ResetPasswordPageProps) {
  const [linkStatus, setLinkStatus] = useState<LinkStatus>(
    hasRecoveryLinkError() ? 'invalid' : 'checking',
  )
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (hasRecoveryLinkError()) return
    let cancelled = false

    // PASSWORD_RECOVERY はクライアント初期化時に既に発火済みのことがあるため、
    // イベントの購読に加えて、現在のセッション有無でも判定する。
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && !cancelled) setLinkStatus('ready')
    })

    getSession()
      .then((session) => {
        if (cancelled) return
        setLinkStatus((prev) =>
          prev === 'ready' ? prev : session ? 'ready' : 'invalid',
        )
      })
      .catch(() => {
        if (!cancelled) setLinkStatus('invalid')
      })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return
    setFormError(null)

    const nextPasswordError = !password
      ? 'このフィールドに入力してください'
      : password.length < 6
        ? 'パスワードは6文字以上にしてください'
        : null
    const nextConfirmError = !confirm
      ? 'このフィールドに入力してください'
      : password !== confirm
        ? 'パスワードが一致しません'
        : null
    setPasswordError(nextPasswordError)
    setConfirmError(nextConfirmError)
    if (nextPasswordError || nextConfirmError) return

    setIsSubmitting(true)
    try {
      const authUser = await updatePassword(password)
      let nextUser = authUser
      try {
        nextUser = mergeMeIntoUser(authUser, await getMe())
      } catch (error) {
        // パスワード更新は成功しているので、プロフィール取得失敗でも進める
        console.error('GET /v1/me failed', error)
      }
      onCompleted?.(nextUser)
    } catch (error) {
      setFormError(toAuthErrorMessage(error, 'パスワードの更新に失敗しました'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (linkStatus === 'checking') {
    return (
      <div className="auth-page">
        <main className="auth-page__main">
          <p className="auth-page__message" role="status">
            確認しています…
          </p>
        </main>
      </div>
    )
  }

  if (linkStatus === 'invalid') {
    return (
      <div className="auth-page">
        <main className="auth-page__main">
          <div className="auth-page__form">
            <h1 className="auth-page__title">
              リンクが
              <br />
              使えません
            </h1>
            <p className="auth-page__message" role="alert">
              リンクの有効期限が切れているか、すでに使用された可能性があります。もう一度メールを送信してください。
            </p>
            <button
              type="button"
              className="auth-page__submit"
              onClick={onRequestNewLink}
            >
              メールを再送する
            </button>
            <button
              type="button"
              className="auth-page__link"
              onClick={onGoLogin}
            >
              ログインに戻る
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <main className="auth-page__main">
        <form className="auth-page__form" onSubmit={handleSubmit} noValidate>
          <h1 className="auth-page__title">
            新しいパスワードを
            <br />
            設定
          </h1>

          <div className="auth-page__fields">
            <div className="auth-page__field">
              <label className="auth-page__sr-only" htmlFor="reset-password">
                新しいパスワード
              </label>
              <input
                id="reset-password"
                className="auth-page__input"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setPasswordError(null)
                  setFormError(null)
                }}
                placeholder="新しいパスワード(6文字以上)"
                aria-invalid={passwordError != null}
              />
              {passwordError ? (
                <p className="auth-page__field-error" role="alert">
                  {passwordError}
                </p>
              ) : null}
            </div>

            <div className="auth-page__field">
              <label className="auth-page__sr-only" htmlFor="reset-confirm">
                新しいパスワード(確認)
              </label>
              <input
                id="reset-confirm"
                className="auth-page__input"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value)
                  setConfirmError(null)
                  setFormError(null)
                }}
                placeholder="新しいパスワード(確認)"
                aria-invalid={confirmError != null}
              />
              {confirmError ? (
                <p className="auth-page__field-error" role="alert">
                  {confirmError}
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
            {isSubmitting ? '更新中…' : 'パスワードを更新 →'}
          </button>
        </form>
      </main>
    </div>
  )
}
