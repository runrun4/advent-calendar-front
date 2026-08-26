import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { UserRound } from 'lucide-react'
import type { User as AppUser } from '../../types/user'
import { logout } from '../../services/authService'
import { ApiError } from '../../services/apiClient'
import { getMe, updateProfile } from '../../services/userApi'
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushStatus,
  isIOS,
  isPushSupported,
  isStandalone,
  requestNotificationPermission,
  sendTestNotification,
} from '../../services/pushNotificationService'
import { Modal } from '../common/Modal'
import './ProfileModal.css'

function toMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

type ProfileModalProps = {
  isOpen: boolean
  user: AppUser | null
  onClose: () => void
  onLoggedOut: () => void
  onUserUpdated?: (user: AppUser) => void
}

/*
 * 開いている間だけ中身をマウントする。
 *
 * 開いたときに state を effect で組み直す代わりに、
 * マウント時の初期値としてフォームを組み立てる。
 * 最新プロフィールの取得もマウント時の一度きりになる。
 */
export function ProfileModal({
  isOpen,
  user,
  onClose,
  onLoggedOut,
  onUserUpdated,
}: ProfileModalProps) {
  if (!isOpen) return null

  return (
    <ProfileModalContent
      user={user}
      onClose={onClose}
      onLoggedOut={onLoggedOut}
      onUserUpdated={onUserUpdated}
    />
  )
}

type ProfileModalContentProps = Omit<ProfileModalProps, 'isOpen'>

function ProfileModalContent({
  user,
  onClose,
  onLoggedOut,
  onUserUpdated,
}: ProfileModalContentProps) {
  const [nickname, setNickname] = useState(() => user?.displayName ?? '')
  const [email] = useState(() => user?.email ?? '')
  const [iconUrl, setIconUrl] = useState<string | null>(
    () => user?.iconUrl ?? null,
  )
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [nicknameError, setNicknameError] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isPushSubscribed, setIsPushSubscribed] = useState(false)
  const [pushPermission, setPushPermission] =
    useState<NotificationPermission>('default')
  const [isPushBusy, setIsPushBusy] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)
  const [pushMessage, setPushMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const pushSupported = isPushSupported()
  const needsHomeScreen = pushSupported && isIOS() && !isStandalone()

  // 開いたタイミングだけ最新プロフィールを取りに行く
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoadingProfile(true)
      try {
        const me = await getMe()
        if (cancelled) return
        // 取れなかった項目は開いた時点の値（初期値）のまま残す
        setNickname((prev) => me.displayName || prev)
        setIconUrl((prev) => me.avatarUrl ?? prev)
      } catch (error) {
        if (cancelled) return
        console.error('GET /v1/me failed in profile modal', error)
      } finally {
        if (!cancelled) setIsLoadingProfile(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  // モーダルを開くたびに、この端末の通知許可状態と購読有無を読み直す
  useEffect(() => {
    let cancelled = false

    void getPushStatus().then((status) => {
      if (cancelled) return
      setPushError(null)
      setPushMessage(null)
      setPushPermission(status.permission)
      setIsPushSubscribed(status.subscribed)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const handlePickImage = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setAvatarFile(file)
    setErrorMessage(null)
    setSuccessMessage(null)

    const url = URL.createObjectURL(file)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
  }

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const trimmed = nickname.trim()
    if (!trimmed) {
      setNicknameError('このフィールドに入力してください')
      return
    }
    if (trimmed.length > 40) {
      setNicknameError('ニックネームは40文字以内で入力してください')
      return
    }

    setIsSaving(true)
    try {
      const updated = await updateProfile({
        displayName: trimmed,
        avatarFile,
      })
      setNickname(updated.displayName)
      setIconUrl(updated.iconUrl)
      setAvatarFile(null)
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      onUserUpdated?.(updated)
      setSuccessMessage('プロフィールを保存しました')
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'プロフィールの保存に失敗しました'
      setErrorMessage(message)
    } finally {
      setIsSaving(false)
    }
  }

  /*
   * 通知トグル。
   *
   * iOS Safari は「タップの同期的な延長」でしか通知許可ダイアログを出さないため、
   * ON にするときは await を挟む前に requestNotificationPermission() を呼ぶ。
   */
  const handleTogglePush = (nextEnabled: boolean) => {
    setPushError(null)
    setPushMessage(null)

    if (!nextEnabled) {
      setIsPushBusy(true)
      void disablePushNotifications()
        .then(() => {
          setIsPushSubscribed(false)
          setPushMessage('通知をオフにしました')
        })
        .catch((error: unknown) => {
          setPushError(toMessage(error, '通知の解除に失敗しました'))
        })
        .finally(() => setIsPushBusy(false))
      return
    }

    // ここより前に await / then を挟まないこと（user activation が切れる）
    const permissionPromise = requestNotificationPermission()

    setIsPushBusy(true)
    void permissionPromise
      .then(async (permission) => {
        setPushPermission(permission)

        if (permission !== 'granted') {
          throw new Error('通知が許可されませんでした')
        }

        await enablePushNotifications()
        setIsPushSubscribed(true)
        setPushMessage('通知をオンにしました')
      })
      .catch((error: unknown) => {
        setIsPushSubscribed(false)
        setPushError(toMessage(error, '通知の設定に失敗しました'))
      })
      .finally(() => setIsPushBusy(false))
  }

  const handleSendTestNotification = async () => {
    setPushError(null)
    setPushMessage(null)
    setIsPushBusy(true)

    try {
      const result = await sendTestNotification()
      setPushMessage(
        `テスト通知を送信しました（成功 ${result.sent} 件 / 失敗 ${result.failed} 件）`,
      )
    } catch (error) {
      setPushError(toMessage(error, 'テスト通知の送信に失敗しました'))
    } finally {
      setIsPushBusy(false)
    }
  }

  const handleLogout = async () => {
    setErrorMessage(null)
    setShowLogoutConfirm(false)
    setIsLoggingOut(true)

    try {
      await logout()
      onClose()
      onLoggedOut()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'ログアウトに失敗しました'
      setErrorMessage(message)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const displayImage = previewUrl ?? iconUrl

  return (
    <>
    <Modal
      isOpen
      title="プロフィール"
      onClose={onClose}
      variant="light"
    >
      <form className="profile-modal" onSubmit={(e) => void handleSave(e)}>
        {!user ? (
          <p className="profile-modal__empty">ユーザー情報がありません</p>
        ) : (
          <>
            <div className="profile-modal__avatar-wrap">
              <div className="profile-modal__avatar">
                {displayImage ? (
                  <img
                    className="profile-modal__avatar-image"
                    src={displayImage}
                    alt="プロフィール画像"
                  />
                ) : (
                  <UserRound
                    className="profile-modal__avatar-fallback"
                    aria-hidden="true"
                  />

                )}
              </div>

              <button
                type="button"
                className="profile-modal__avatar-edit"
                onClick={handlePickImage}
                disabled={isSaving || isLoggingOut || isLoadingProfile}
              >
                写真を変更
              </button>

              <input
                ref={fileInputRef}
                className="profile-modal__file-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>

            <div className="profile-modal__field">
              <label className="profile-modal__label" htmlFor="profile-nickname">
                ニックネーム
              </label>
              <input
                id="profile-nickname"
                className="profile-modal__input"
                type="text"
                autoComplete="nickname"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value)
                  setNicknameError(null)
                  setSuccessMessage(null)
                }}
                disabled={isSaving || isLoggingOut || isLoadingProfile}
                aria-invalid={nicknameError != null}
              />
              {nicknameError ? (
                <p className="profile-modal__field-error" role="alert">
                  {nicknameError}
                </p>
              ) : null}
            </div>

            <div className="profile-modal__field">
              <label className="profile-modal__label" htmlFor="profile-email">
                メールアドレス
              </label>
              <input
                id="profile-email"
                className="profile-modal__input profile-modal__input--readonly"
                type="email"
                value={email}
                readOnly
                disabled
              />
              <p className="profile-modal__hint">メールアドレスは変更できません</p>
            </div>

            <section className="profile-modal__section">
              <h3 className="profile-modal__section-title">通知</h3>

              {!pushSupported ? (
                <p className="profile-modal__hint">
                  このブラウザは通知に対応していません
                </p>
              ) : needsHomeScreen ? (
                <p className="profile-modal__hint">
                  通知を使うにはホーム画面に追加してから開いてください
                </p>
              ) : pushPermission === 'denied' ? (
                <p className="profile-modal__hint">
                  通知がブロックされています。端末の設定から許可してください
                </p>
              ) : (
                <>
                  <div className="profile-modal__toggle-row">
                    <span className="profile-modal__toggle-label">
                      お知らせを受け取る
                    </span>

                    <button
                      type="button"
                      className={
                        isPushSubscribed
                          ? 'profile-modal__toggle is-on'
                          : 'profile-modal__toggle'
                      }
                      role="switch"
                      aria-checked={isPushSubscribed}
                      aria-label="通知を受け取る"
                      onClick={() => handleTogglePush(!isPushSubscribed)}
                      disabled={isPushBusy || isSaving || isLoggingOut}
                    >
                      <span
                        className="profile-modal__toggle-knob"
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  {isPushSubscribed ? (
                    <button
                      type="button"
                      className="profile-modal__test-push"
                      onClick={() => void handleSendTestNotification()}
                      disabled={isPushBusy || isSaving || isLoggingOut}
                    >
                      テスト通知を送る
                    </button>
                  ) : null}
                </>
              )}

              {pushError ? (
                <p className="profile-modal__error" role="alert">
                  {pushError}
                </p>
              ) : null}

              {pushMessage ? (
                <p className="profile-modal__success" role="status">
                  {pushMessage}
                </p>
              ) : null}
            </section>
          </>
        )}

        {errorMessage ? (
          <p className="profile-modal__error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="profile-modal__success" role="status">
            {successMessage}
          </p>
        ) : null}

        {user ? (
          <button
            type="submit"
            className="profile-modal__save"
            disabled={isSaving || isLoggingOut || isLoadingProfile}
          >
            {isSaving ? '保存中…' : '保存する'}
          </button>
        ) : null}

        <button
          type="button"
          className="profile-modal__logout"
          onClick={() => {
            setErrorMessage(null)
            setShowLogoutConfirm(true)
          }}
          disabled={isLoggingOut || isSaving}
        >
          {isLoggingOut ? 'ログアウト中…' : 'ログアウト'}
        </button>
      </form>
    </Modal>

      {showLogoutConfirm
        ? createPortal(
            <div
              className="profile-modal__confirm-backdrop"
              role="presentation"
              onClick={() => !isLoggingOut && setShowLogoutConfirm(false)}
            >
              <div
                className="profile-modal__confirm"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="profile-logout-confirm-title"
                onClick={(event) => event.stopPropagation()}
              >
                <p
                  id="profile-logout-confirm-title"
                  className="profile-modal__confirm-message"
                >
                  本当にログアウトしますか？
                </p>
                <div className="profile-modal__confirm-actions">
                  <button
                    type="button"
                    className="profile-modal__confirm-button profile-modal__confirm-button--cancel"
                    onClick={() => setShowLogoutConfirm(false)}
                    disabled={isLoggingOut}
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    className="profile-modal__confirm-button profile-modal__confirm-button--logout"
                    onClick={() => void handleLogout()}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? 'ログアウト中…' : 'ログアウト'}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
