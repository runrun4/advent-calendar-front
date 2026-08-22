import { useState } from 'react'
import { ApiError } from '../../services/apiClient'
import { createEvent, type EventSummary } from '../../services/eventApi'
import './PrivateEventDetailPage.css'

type PrivateEventDetailPageProps = {
  eventName: string
  startDate: string
  endDate: string
  countdownDays: number
  category: string
  onCreated?: (event: EventSummary) => void
  onBusyChange?: (isBusy: boolean) => void
}

function buildDescription(
  detail: string,
  eventUrl: string,
  eventUrl2: string,
): string | null {
  const parts = [
    detail.trim(),
    eventUrl.trim(),
    eventUrl2.trim(),
  ].filter(Boolean)

  if (parts.length === 0) return null
  return parts.join('\n').slice(0, 500)
}

export function PrivateEventDetailPage({
  eventName,
  startDate,
  endDate,
  countdownDays,
  category,
  onCreated,
  onBusyChange,
}: PrivateEventDetailPageProps) {
  const [detail, setDetail] = useState('')
  const [eventUrl, setEventUrl] = useState('')
  const [eventUrl2, setEventUrl2] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    if (isCreating || !detail.trim()) return

    setErrorMessage(null)
    setIsCreating(true)
    onBusyChange?.(true)

    try {
      const created = await createEvent({
        name: eventName,
        startDate,
        endDate,
        countdownDays,
        mode: 'PERSONAL',
        category,
        description: buildDescription(detail, eventUrl, eventUrl2),
      })
      onCreated?.(created)
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'イベントの作成に失敗しました'
      setErrorMessage(message)
      setIsCreating(false)
      onBusyChange?.(false)
    }
  }

  if (isCreating) {
    return (
      <div className="private-event-detail private-event-detail--waiting">
        <div className="private-event-detail__type-wrap">
          <div className="private-event-detail__type">
            プライベート
          </div>
        </div>
        <div className="private-event-detail__spinner" aria-hidden="true" />
        <p className="private-event-detail__waiting-title">
          アドベントカレンダーを作成しています
        </p>
        <p className="private-event-detail__waiting-text">
          完了したら自動で画面が切り替わります
        </p>
      </div>
    )
  }

  return (
    <div className="private-event-detail">
      <div className="private-event-detail__type-wrap">
        <div className="private-event-detail__type">
          プライベート
        </div>
      </div>

      <p className="private-event-detail__message">
        ＞そのイベントについて、もっと詳しく
        <br />
        &nbsp;&nbsp;教えてくれますか？
      </p>

      <section className="private-event-detail__section">
        <h2 className="private-event-detail__heading">
          詳細を書く
        </h2>

        <textarea
          className="private-event-detail__textarea"
          value={detail}
          onChange={(event) => {
            setDetail(event.target.value)
            setErrorMessage(null)
          }}
          placeholder="例）〇〇ちゃんと〇〇くんと、梅田に遊びに行きます。〇〇というカフェに行きます。"
          enterKeyHint="done"
          disabled={isCreating}
        />
      </section>

      <section className="private-event-detail__section private-event-detail__section--url">
        <h2 className="private-event-detail__heading">
          イベントのURL（任意）
        </h2>

        <div className="private-event-detail__url-inputs">
          <input
            type="url"
            className="private-event-detail__input"
            value={eventUrl}
            onChange={(event) => {
              setEventUrl(event.target.value)
              setErrorMessage(null)
            }}
            inputMode="url"
            enterKeyHint="done"
            aria-label="イベントのURL 1"
            disabled={isCreating}
          />

          <input
            type="url"
            className="private-event-detail__input"
            value={eventUrl2}
            onChange={(event) => {
              setEventUrl2(event.target.value)
              setErrorMessage(null)
            }}
            inputMode="url"
            enterKeyHint="done"
            aria-label="イベントのURL 2"
            disabled={isCreating}
          />
        </div>
      </section>

      {errorMessage ? (
        <p className="private-event-detail__error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="button"
        className="private-event-detail__submit"
        onClick={() => void handleCreate()}
        disabled={isCreating || !detail.trim()}
      >
        {isCreating ? '作成中…' : '作成する'}
      </button>
    </div>
  )
}
