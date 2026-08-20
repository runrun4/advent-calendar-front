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
    color: '#BDE0FE',
  },
]

export function EventList() {
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
          >
            <span className="event-list__item-title">
              {event.title}
            </span>
          </button>
        )
      })}

      <button
        type="button"
        className="event-list__add-button"
        aria-label="イベントを追加"
      >
        ＋
      </button>
    </div>
  )
}