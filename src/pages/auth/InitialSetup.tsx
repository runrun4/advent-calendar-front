import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { UserRound } from 'lucide-react'
import type { User } from '../../types/user'
import { ApiError } from '../../services/apiClient'
import { saveInitialProfile } from '../../services/userApi'
import './InitialSetup.css'

type InitialSetupProps = {
  onComplete?: (user: User) => void
}

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}

export function InitialSetup({ onComplete }: InitialSetupProps) {
  const [nickname, setNickname] = useState('')
  const [nicknameError, setNicknameError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePickImage = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setAvatarFile(file)
    setFormError(null)

    const url = URL.createObjectURL(file)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    const trimmed = nickname.trim()
    if (!trimmed) {
      setNicknameError('このフィールドに入力してください')
      return
    }
    if (trimmed.length > 40) {
      setNicknameError('ニックネームは40文字以内で入力してください')
      return
    }

    setIsSubmitting(true)

    try {
      const user = await saveInitialProfile({
        displayName: trimmed,
        avatarFile,
      })
      onComplete?.(user)
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'プロフィールの保存に失敗しました'
      setFormError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="initial-setup">
      <main className="initial-setup__main">
        <form className="initial-setup__form" onSubmit={handleSubmit} noValidate>
          <h1 className="initial-setup__title">
            プロフィールを
            <br />
            設定しましょう！
          </h1>

          <div className="initial-setup__avatar-wrap">
            <div
              className="initial-setup__avatar"
              aria-hidden={previewUrl ? undefined : true}
            >
              {previewUrl ? (
                <img
                  className="initial-setup__avatar-image"
                  src={previewUrl}
                  alt="選択したプロフィール画像"
                />
              ) : (
                <UserRound
                  className="initial-setup__avatar-icon"
                  aria-hidden="true"
                />
              )}
            </div>

            <button
              type="button"
              className="initial-setup__add-photo"
              onClick={handlePickImage}
              aria-label="プロフィール画像を追加"
              disabled={isSubmitting}
            >
              <PlusIcon />
            </button>

            <input
              ref={fileInputRef}
              className="initial-setup__file-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>

          <div className="initial-setup__panel">
            <div className="initial-setup__field">
              <label className="initial-setup__sr-only" htmlFor="setup-nickname">
                ニックネーム
              </label>
              <input
                id="setup-nickname"
                className="initial-setup__input"
                type="text"
                autoComplete="nickname"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value)
                  setNicknameError(null)
                  setFormError(null)
                }}
                placeholder="ニックネーム"
                aria-invalid={nicknameError != null}
                disabled={isSubmitting}
              />
              {nicknameError ? (
                <p className="initial-setup__field-error" role="alert">
                  {nicknameError}
                </p>
              ) : null}
              {formError ? (
                <p className="initial-setup__field-error" role="alert">
                  {formError}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              className="initial-setup__submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? '保存中…' : '設定完了'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
