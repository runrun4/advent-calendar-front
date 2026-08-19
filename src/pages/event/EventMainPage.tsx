import { useState } from 'react'
import { Header } from '../../components/layout/Header'
import { AdventCalendar } from './AdventCalendar'
import { ChatView } from './ChatView'
import { EventDetail } from './EventDetail'
import { EventList } from './EventList'

type EventPanel = 'list' | 'advent' | 'chat'
type EventView = EventPanel | 'detail'

type EventMainPageProps = {
  onOpenProfile?: () => void
}

const PANELS: { id: EventPanel; label: string }[] = [
  { id: 'list', label: '一覧' },
  { id: 'advent', label: 'アドベント' },
  { id: 'chat', label: 'チャット' },
]

export function EventMainPage({ onOpenProfile }: EventMainPageProps) {
  const [view, setView] = useState<EventView>('list')

  if (view === 'detail') {
    return <EventDetail onBack={() => setView('list')} />
  }

  return (
    <div className="event-main">
      <Header onOpenProfile={onOpenProfile} />
      <div className="event-main__panels" role="tablist" aria-label="イベント内表示">
        {PANELS.map((panel) => (
          <button
            key={panel.id}
            type="button"
            role="tab"
            aria-selected={view === panel.id}
            className={
              view === panel.id
                ? 'event-main__panel is-active'
                : 'event-main__panel'
            }
            onClick={() => setView(panel.id)}
          >
            {panel.label}
          </button>
        ))}
      </div>

      <div className="event-main__content">
        {view === 'list' ? (
          <EventList onOpenDetail={() => setView('detail')} />
        ) : null}
        {view === 'advent' ? <AdventCalendar /> : null}
        {view === 'chat' ? <ChatView /> : null}
      </div>
    </div>
  )
}
