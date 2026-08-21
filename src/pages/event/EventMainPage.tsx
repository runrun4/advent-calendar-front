import { useState } from 'react'
import { Header } from '../../components/layout/Header'
import { AdventCalendar } from './AdventCalendar'
import { EventList } from './EventList'
import { MemoriesPage } from '../memories/MemoriesPage'

type EventMainPageProps = {
  onOpenProfile?: () => void
  onOpenEventAdd?: () => void
}

type AdventTarget = {
  id: number
  title: string
  source: 'event' | 'memory'
}

export function EventMainPage({
  onOpenProfile,
  onOpenEventAdd,
}: EventMainPageProps) {
  const [adventTarget, setAdventTarget] = useState<AdventTarget | null>(null)

  if (adventTarget !== null) {
    return (
      <AdventCalendar
        title={adventTarget.title}
        onBack={() => setAdventTarget(null)}
      />
    )
  }

  return (
    <div className="event-main">
      <Header onOpenProfile={onOpenProfile} />

      <main className="event-main__content">
        <div className="event-main__scroll-area">
          <section className="event-main__section event-main__section--events">
            <EventList
              onOpenEventAdd={onOpenEventAdd}
              onSelectEvent={(event) =>
                setAdventTarget({
                  id: event.id,
                  title: event.title,
                  source: 'event',
                })
              }
            />
          </section>

          <section className="event-main__section event-main__section--memories">
            <h2 className="page-title event-main__section-title">
              Reflection
            </h2>

            <MemoriesPage
              onSelectMemory={(memory) =>
                setAdventTarget({
                  id: memory.id,
                  title: memory.title,
                  source: 'memory',
                })
              }
            />
          </section>
        </div>
      </main>
    </div>
  )
}
