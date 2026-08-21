import { useState } from 'react'
import type { User } from '../../types/user'
import { logout } from '../../services/authService'
import { Modal } from '../common/Modal'
import './ProfileModal.css'

type ProfileModalProps = {
  isOpen: boolean
  user: User | null
  onClose: () => void
  onLoggedOut: () => void
}

export function ProfileModal({
  isOpen,
  user,
  onClose,
  onLoggedOut,
}: ProfileModalProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleLogout = async () => {
    setErrorMessage(null)
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

  return (
    <Modal
      isOpen={isOpen}
      title="プロフィール"
      onClose={onClose}
      variant="light"
    >
      <div className="profile-modal">
        {user ? (
          <div className="profile-modal__info">
            <p className="profile-modal__name">
              {user.displayName || '名前未設定'}
            </p>
            {user.email ? (
              <p className="profile-modal__email">{user.email}</p>
            ) : null}
          </div>
        ) : (
          <p className="profile-modal__empty">ユーザー情報がありません</p>
        )}

        {errorMessage ? (
          <p className="profile-modal__error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="button"
          className="profile-modal__logout"
          onClick={() => void handleLogout()}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? 'ログアウト中…' : 'ログアウト'}
        </button>
      </div>
    </Modal>
  )
}
