import type { InviteAcceptResult } from '../../hooks/useInviteAccept'
import './InviteAcceptModal.css'

type InviteAcceptModalProps = {
  result: InviteAcceptResult | null
  onClose: () => void
}

function getTitle(result: InviteAcceptResult): string {
  switch (result.kind) {
    case 'joined':
      return 'イベントに参加しました'
    case 'already':
      return 'すでに参加しています'
    case 'failed':
      return '参加できませんでした'
  }
}

export function InviteAcceptModal({
  result,
  onClose,
}: InviteAcceptModalProps) {
  if (result === null) return null

  return (
    <div
      className="invite-accept-modal__backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="invite-accept-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-accept-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="invite-accept-title" className="invite-accept-modal__title">
          {getTitle(result)}
        </h2>

        {result.kind === 'failed' ? (
          <p className="invite-accept-modal__error" role="alert">
            {result.message}
          </p>
        ) : (
          <p className="invite-accept-modal__message">
            <span className="invite-accept-modal__event-name">
              {result.eventName}
            </span>
            {result.kind === 'joined'
              ? ' に参加しました。一緒にカウントダウンしよう！'
              : ' はすでにイベント一覧にあります。'}
          </p>
        )}

        <button
          type="button"
          className="invite-accept-modal__button"
          onClick={onClose}
        >
          {result.kind === 'failed' ? '閉じる' : 'イベント一覧へ'}
        </button>
      </div>
    </div>
  )
}
