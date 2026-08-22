import { useEffect, useState } from 'react'
import { listEvents, type EventSummary } from '../../services/eventApi'
import { ApiError } from '../../services/apiClient'

export type EventListItem = {
  id: string
  title: string
  status: string
}

type EventListProps = {
  onOpenEventAdd?: () => void
  onSelectEvent?: (event: EventListItem) => void
}

function toListItem(event: EventSummary): EventListItem {
  return {
    id: event.id,
    title: event.name,
    status: event.status,
  }
}

export function EventList({ onOpenEventAdd, onSelectEvent }: EventListProps) {
  const [events, setEvents] = useState<EventListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const summaries = await listEvents(controller.signal)
        const active = summaries
          .filter((event) => event.status === 'ACTIVE')
          .map(toListItem)
        setEvents(active)
      } catch (error) {
        if (controller.signal.aborted) return
        const message =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'イベント一覧の取得に失敗しました'
        setErrorMessage(message)
        setEvents([])
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      controller.abort()
    }
  }, [])

  return (
    <div className="event-list">
      {isLoading ? (
        <p className="event-list__status">読み込み中…</p>
      ) : null}

      {!isLoading && errorMessage ? (
        <p className="event-list__status event-list__status--error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {!isLoading && !errorMessage && events.length === 0 ? (
        <p className="event-list__status">参加中のイベントはまだありません</p>
      ) : null}

      {events.map((event) => (
        <button
          key={event.id}
          type="button"
          className="event-list__item"
          onClick={() => onSelectEvent?.(event)}
        >
          <span className="event-list__item-title">{event.title}</span>

          <span className="event-list__item-arrow" aria-hidden="true">
            »
          </span>
        </button>
      ))}

      <button
        type="button"
        className="event-list__add-button"
        aria-label="イベントを追加"
        onClick={onOpenEventAdd}
      >
        ＋
      </button>
    </div>
  )
}
