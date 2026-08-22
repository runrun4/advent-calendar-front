import { useState, useEffect } from 'react'
import { Header } from '../../components/layout/Header'
import { AdventCalendar } from './AdventCalendar'
import { EventList } from './EventList'
import { MemoriesPage } from '../memories/MemoriesPage'

type EventMainPageProps = {
  onOpenProfile?: () => void
  onOpenEventAdd?: () => void
  onDetailOpenChange?: (isOpen: boolean) => void
}

type AdventTarget = {
  id: string
  title: string
  source: 'event' | 'memory'
}

export function EventMainPage({
  onOpenProfile,
  onOpenEventAdd,
  onDetailOpenChange,
}: EventMainPageProps) {
  const [adventTarget, setAdventTarget] = useState<AdventTarget | null>(null)
  const [isReflectionOpen, setIsReflectionOpen] = useState(true)


  useEffect(() => {
  onDetailOpenChange?.(adventTarget !== null)
}, [adventTarget, onDetailOpenChange])

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
            <h2 className="page-title event-main__section-title">
              EVENT
            </h2>

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
            <button
              type="button"
              className="event-main__section-toggle"
              onClick={() => setIsReflectionOpen((open) => !open)}
              aria-expanded={isReflectionOpen}
              aria-controls="reflection-list"
            >
              <span
                className="page-title event-main__section-title"
                role="heading"
                aria-level={2}
              >
                Reflection
              </span>
              <span
                className={`event-main__section-chevron${
                  isReflectionOpen ? ' is-open' : ''
                }`}
                aria-hidden="true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </span>
            </button>

            {isReflectionOpen ? (
              <div id="reflection-list">
                <MemoriesPage
                  onSelectMemory={(memory) =>
                    setAdventTarget({
                      id: String(memory.id),
                      title: memory.title,
                      source: 'memory',
                    })
                  }
                />
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  )
}
