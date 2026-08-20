import { Header } from '../../components/layout/Header'
import { EventList } from './EventList'
import { MemoriesPage } from '../memories/MemoriesPage'

type EventMainPageProps = {
  onOpenProfile?: () => void
}

export function EventMainPage({ onOpenProfile }: EventMainPageProps) {
  return (
    <div className="event-main">
      <Header onOpenProfile={onOpenProfile} />

      <main className="event-main__content">
        <section className="event-main__section event-main__section--events">
          <div className="event-main__scroll-area">
            <EventList />
          </div>
        </section>

        <section className="event-main__section event-main__section--memories">
          <h2 className="page-title event-main__section-title">
            Reflection
          </h2>

          <div className="event-main__scroll-area">
            <MemoriesPage />
          </div>
        </section>
      </main>
    </div>
  )
}