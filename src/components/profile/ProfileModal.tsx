import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { UserRound } from 'lucide-react'
import type { User as AppUser } from '../../types/user'
import { logout } from '../../services/authService'
import { ApiError } from '../../services/apiClient'
import { getMe, updateProfile } from '../../services/userApi'
import { Modal } from '../common/Modal'
import './ProfileModal.css'

type ProfileModalProps = {
  isOpen: boolean
  user: AppUser | null
  onClose: () => void
  onLoggedOut: () => void
  onUserUpdated?: (user: AppUser) => void
}

export function ProfileModal({
  isOpen,
  user,
  onClose,
  onLoggedOut,
  onUserUpdated,
}: ProfileModalProps) {
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [nicknameError, setNicknameError] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return

    setNickname(user?.displayName ?? '')
    setEmail(user?.email ?? '')
    setIconUrl(user?.iconUrl ?? null)
    setAvatarFile(null)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setNicknameError(null)
    setErrorMessage(null)
    setSuccessMessage(null)
    setShowLogoutConfirm(false)

    let cancelled = false

    const load = async () => {
      setIsLoadingProfile(true)
      try {
        const me = await getMe()
        if (cancelled) return
        setNickname(me.displayName || user?.displayName || '')
        setIconUrl(me.avatarUrl ?? user?.iconUrl ?? null)
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
    // 開いたタイミングだけ最新プロフィールを取りに行く
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open-only fetch
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

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
      isOpen={isOpen}
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
