export type EventListItem = {
  id: string
  title: string
  status: string
}

const EMPTY_EVENTS_MESSAGE = (
  <>
    参加中のイベントはまだありません
    <br />
    下のプラスボタンからイベントを追加しよう！
  </>
)

type EventListProps = {
  events: EventListItem[]
  isLoading?: boolean
  onOpenEventAdd?: () => void
  onSelectEvent?: (event: EventListItem) => void
}

export function EventList({
  events,
  isLoading = false,
  onOpenEventAdd,
  onSelectEvent,
}: EventListProps) {
  return (
    <div className="event-list">
      {isLoading ? (
        <p className="event-list__status">読み込み中…</p>
      ) : null}

      {!isLoading && events.length === 0 ? (
        <p className="event-list__status">{EMPTY_EVENTS_MESSAGE}</p>
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
