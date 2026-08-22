import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ApiError } from '../../services/apiClient'
import { createInvitation } from '../../services/eventApi'
import './ShareInviteModal.css'

type ShareInviteModalProps = {
  isOpen: boolean
  eventId: string
  eventName: string
  onClose: () => void
}

export function ShareInviteModal({
  isOpen,
  eventId,
  eventName,
  onClose,
}: ShareInviteModalProps) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setInviteUrl(null)
      setErrorMessage(null)
      setCopied(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    const load = async () => {
      try {
        const invitation = await createInvitation(eventId)
        if (cancelled) return
        setInviteUrl(invitation.inviteUrl)
      } catch (error) {
        if (cancelled) return
        const message =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : '招待リンクの作成に失敗しました'
        setErrorMessage(message)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [isOpen, eventId])

  if (!isOpen) return null

  const handleCopy = async () => {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
    } catch {
      setErrorMessage('コピーに失敗しました')
    }
  }

  const handleShare = async () => {
    if (!inviteUrl || typeof navigator.share !== 'function') return
    try {
      await navigator.share({
        title: eventName,
        text: `「${eventName}」に参加しませんか？`,
        url: inviteUrl,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setErrorMessage('共有に失敗しました')
    }
  }

  return createPortal(
    <div
      className="share-invite-modal__backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="share-invite-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-invite-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="share-invite-title" className="share-invite-modal__title">
          友達に共有
        </h2>
        <p className="share-invite-modal__message">
          招待リンクを送って、一緒にカウントダウンしよう
        </p>

        {isLoading ? (
          <p className="share-invite-modal__status">リンクを用意しています…</p>
        ) : null}

        {errorMessage ? (
          <p className="share-invite-modal__error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {inviteUrl ? (
          <p className="share-invite-modal__url">{inviteUrl}</p>
        ) : null}

        <div className="share-invite-modal__actions">
          <button
            type="button"
            className="share-invite-modal__button share-invite-modal__button--secondary"
            onClick={() => void handleCopy()}
            disabled={!inviteUrl}
          >
            {copied ? 'コピー済み' : 'リンクをコピー'}
          </button>

          {typeof navigator !== 'undefined' &&
          typeof navigator.share === 'function' ? (
            <button
              type="button"
              className="share-invite-modal__button share-invite-modal__button--primary"
              onClick={() => void handleShare()}
              disabled={!inviteUrl}
            >
              共有する
            </button>
          ) : (
            <button
              type="button"
              className="share-invite-modal__button share-invite-modal__button--primary"
              onClick={onClose}
            >
              閉じる
            </button>
          )}
        </div>

        {typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' ? (
          <button
            type="button"
            className="share-invite-modal__skip"
            onClick={onClose}
          >
            あとで
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
