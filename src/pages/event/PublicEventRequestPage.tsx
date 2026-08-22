import { useState } from 'react'
import { ApiError } from '../../services/apiClient'
import { createEvent, type EventSummary } from '../../services/eventApi'
import './PublicEventRequestPage.css'

type PublicEventRequestPageProps = {
  eventName: string
  startDate: string
  endDate: string
  countdownDays: number
  location: string
  iconId?: string
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

export function PublicEventRequestPage({
  eventName,
  startDate,
  endDate,
  countdownDays,
  location,
  iconId,
  onCreated,
  onBusyChange,
}: PublicEventRequestPageProps) {
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
        mode: 'GROUP',
        category: location,
        description: buildDescription(detail, eventUrl, eventUrl2),
        ...(iconId ? { iconId } : {}),
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
      <div className="public-event-request public-event-request--waiting">
        <div className="public-event-request__type-wrap">
          <div className="public-event-request__type">
            パブリックイベント
          </div>
        </div>
        <div className="public-event-request__spinner" aria-hidden="true" />
        <p className="public-event-request__waiting-title">
          アドベントカレンダーを作成しています
        </p>
        <p className="public-event-request__waiting-text">
          完了したら自動で画面が切り替わります
        </p>
      </div>
    )
  }

  return (
    <div className="public-event-request">
      <div className="public-event-request__type-wrap">
        <div className="public-event-request__type">
          パブリックイベント
        </div>
      </div>

      <p className="public-event-request__message">
        ＞イベントが見つかりません；；
        <br />
        &nbsp;&nbsp;そのイベントについて
        <br />
        &nbsp;&nbsp;教えてくれますか？
      </p>

      <section className="public-event-request__section">
        <h2 className="public-event-request__heading">
          詳細を書く
        </h2>

        <textarea
          className="public-event-request__textarea"
          value={detail}
          onChange={(event) => {
            setDetail(event.target.value)
            setErrorMessage(null)
          }}
          placeholder="例)東京ドームで〇月〇日にある、○○というアーティストのライブです。ライブの名前は○○ツアーFinalです。"
          enterKeyHint="done"
          disabled={isCreating}
        />
      </section>

      <section className="public-event-request__section public-event-request__section--url">
        <h2 className="public-event-request__heading">
          イベントのURL(任意)
        </h2>

        <div className="public-event-request__url-inputs">
          <input
            type="url"
            className="public-event-request__input"
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
            className="public-event-request__input"
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
        <p className="public-event-request__error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="button"
        className="public-event-request__submit"
        onClick={() => void handleCreate()}
        disabled={isCreating || !detail.trim()}
      >
        {isCreating ? '作成中…' : 'イベントを作成する'}
      </button>
    </div>
  )
}
