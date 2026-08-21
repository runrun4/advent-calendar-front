import type { CSSProperties } from 'react'

type EventItem = {
  id: number
  title: string
  color: string
}

const events: EventItem[] = [
  {
    id: 1,
    title: 'イベント1',
    color: '#FFD166',
  },
  {
    id: 2,
    title: 'イベント2',
    color: '#8ECAE6',
  },
  {
    id: 3,
    title: 'イベント3',
    color: '#FFADAD',
  },
  {
    id: 4,
    title: 'イベント4',
    color: '#B5EAD7',
  },
  {
    id: 5,
    title: 'イベント5',
    color: '#CDB4DB',
  },
]

type EventListProps = {
  onOpenEventAdd?: () => void
  onSelectEvent?: (event: EventItem) => void
}

export function EventList({ onOpenEventAdd, onSelectEvent }: EventListProps) {
  return (
    <div className="event-list">
      {events.map((event) => {
        const style = {
          '--event-color': event.color,
        } as CSSProperties

        return (
          <button
            key={event.id}
            type="button"
            className="event-list__item"
            style={style}
            onClick={() => onSelectEvent?.(event)}
          >
            <span className="event-list__item-title">
              {event.title}
            </span>

            <span
              className="event-list__item-arrow"
              aria-hidden="true"
            >
              »
            </span>
          </button>
        )
      })}

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
