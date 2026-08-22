import { useEffect, useState } from 'react'
import { Header } from '../../components/layout/Header'
import { listEvents, type BoardOrientation } from '../../services/eventApi'
import { DEFAULT_EVENT_ICON_ID } from './EventNameField'
import { AdventCalendar } from './AdventCalendar'
import { EventList, type EventListItem } from './EventList'
import { MemoriesPage, type MemoryItem } from '../memories/MemoriesPage'
import { EventSettingsModal } from './EventSettingsModal'
import { ShareInviteModal } from './ShareInviteModal'
import { StickerCollectionPage } from './StickerCollectionPage'
import { BoardEditPage } from './BoardEditPage'
import { ChatView } from './ChatView'

type EventMainPageProps = {
  profileIconUrl?: string | null
  eventsRefreshKey?: number
  pendingEvent?: {
    id: string
    name: string
    startDate: string
    boardOrientation?: BoardOrientation
    mode?: string
    iconId?: string
    boardEdited?: boolean
  } | null
  onOpenProfile?: () => void
  onOpenEventAdd?: (startDate?: string) => void
  onDetailOpenChange?: (isOpen: boolean) => void
  onPendingEventConsumed?: () => void
}

type AdventTarget = {
  id: string
  title: string
  startDate: string
  boardOrientation: BoardOrientation
  iconId: string
  boardEdited: boolean
  mode: string
  source: 'event' | 'memory'
}

function toListItem(event: {
  id: string
  name: string
  status: string
  startDate: string
  boardOrientation: BoardOrientation
  iconId: string
  boardEdited: boolean
  mode: string
}): EventListItem {
  return {
    id: event.id,
    title: event.name,
    status: event.status,
    startDate: event.startDate,
    boardOrientation: event.boardOrientation ?? 'PORTRAIT',
    iconId: event.iconId || DEFAULT_EVENT_ICON_ID,
    boardEdited: event.boardEdited ?? false,
    mode: event.mode,
  }
}

export function EventMainPage({
  profileIconUrl = null,
  eventsRefreshKey = 0,
  pendingEvent = null,
  onOpenProfile,
  onOpenEventAdd,
  onDetailOpenChange,
  onPendingEventConsumed,
}: EventMainPageProps) {
  const [adventTarget, setAdventTarget] = useState<AdventTarget | null>(null)
  const [adventView, setAdventView] = useState<
    'calendar' | 'stickers' | 'board-edit' | 'chat'
  >('calendar')
  const [chatReturnView, setChatReturnView] = useState<
    'calendar' | 'stickers'
  >('calendar')
  const [showShareInvite, setShowShareInvite] = useState(false)
  const [showEventSettings, setShowEventSettings] = useState(false)
  const [isReflectionOpen, setIsReflectionOpen] = useState(true)
  const [activeEvents, setActiveEvents] = useState<EventListItem[]>([])
  const [completedEvents, setCompletedEvents] = useState<MemoryItem[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)

  useEffect(() => {
    onDetailOpenChange?.(adventTarget !== null)
    if (adventTarget === null) {
      setAdventView('calendar')
    }
  }, [adventTarget, onDetailOpenChange])

  useEffect(() => {
    if (!pendingEvent) return
    setShowShareInvite(false)
    setAdventTarget({
      id: pendingEvent.id,
      title: pendingEvent.name,
      startDate: pendingEvent.startDate,
      boardOrientation: pendingEvent.boardOrientation ?? 'PORTRAIT',
      iconId: pendingEvent.iconId ?? DEFAULT_EVENT_ICON_ID,
      boardEdited: pendingEvent.boardEdited ?? false,
      mode: pendingEvent.mode ?? 'GROUP',
      source: 'event',
    })

    // カレンダー画面の描画後、0.3秒置いてから招待モーダルを開く。
    let openTimer: number | undefined
    const firstFrame = window.requestAnimationFrame(() => {
      const secondFrame = window.requestAnimationFrame(() => {
        openTimer = window.setTimeout(() => {
          setShowShareInvite(true)
          onPendingEventConsumed?.()
        }, 300)
      })

      frameIds.push(secondFrame)
    })
    const frameIds = [firstFrame]

    return () => {
      frameIds.forEach((frameId) => window.cancelAnimationFrame(frameId))
      if (openTimer !== undefined) {
        window.clearTimeout(openTimer)
      }
    }
  }, [pendingEvent, onPendingEventConsumed])

  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      setIsLoadingEvents(true)

      try {
        const summaries = await listEvents(controller.signal)
        setActiveEvents(
          summaries
            .filter((event) => event.status === 'ACTIVE')
            .map(toListItem),
        )
        setCompletedEvents(
          summaries
            .filter((event) => event.status === 'COMPLETED')
            .map((event) => ({
              id: event.id,
              title: event.name,
              startDate: event.startDate,
              boardOrientation: event.boardOrientation ?? 'PORTRAIT',
              iconId: event.iconId || DEFAULT_EVENT_ICON_ID,
              boardEdited: event.boardEdited ?? false,
              mode: event.mode,
            })),
        )
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('GET /v1/events failed', error)
        setActiveEvents([])
        setCompletedEvents([])
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingEvents(false)
        }
      }
    }

    void load()

    return () => {
      controller.abort()
    }
  }, [eventsRefreshKey])

  const handleBoardOrientationSaved = (
    boardOrientation: BoardOrientation,
    boardEdited: boolean,
  ) => {
    setAdventTarget((current) =>
      current ? { ...current, boardOrientation, boardEdited } : null,
    )
    setActiveEvents((events) =>
      events.map((event) =>
        adventTarget && event.id === adventTarget.id
          ? { ...event, boardOrientation, boardEdited }
          : event,
      ),
    )
    setCompletedEvents((memories) =>
      memories.map((memory) =>
        adventTarget && memory.id === adventTarget.id
          ? { ...memory, boardOrientation, boardEdited }
          : memory,
      ),
    )
  }

  const handleEventNameSaved = (name: string) => {
    setAdventTarget((current) => (current ? { ...current, title: name } : null))
    setActiveEvents((events) =>
      events.map((event) =>
        adventTarget && event.id === adventTarget.id
          ? { ...event, title: name }
          : event,
      ),
    )
    setCompletedEvents((memories) =>
      memories.map((memory) =>
        adventTarget && memory.id === adventTarget.id
          ? { ...memory, title: name }
          : memory,
      ),
    )
  }

  const handleEventIconSaved = (iconId: string) => {
    setAdventTarget((current) => (current ? { ...current, iconId } : null))
    setActiveEvents((events) =>
      events.map((event) =>
        adventTarget && event.id === adventTarget.id
          ? { ...event, iconId }
          : event,
      ),
    )
    setCompletedEvents((memories) =>
      memories.map((memory) =>
        adventTarget && memory.id === adventTarget.id
          ? { ...memory, iconId }
          : memory,
      ),
    )
  }

  const handleLeftRoom = () => {
    setShowEventSettings(false)
    setShowShareInvite(false)
    setAdventTarget(null)

    const controller = new AbortController()
    void listEvents(controller.signal)
      .then((summaries) => {
        setActiveEvents(
          summaries
            .filter((event) => event.status === 'ACTIVE')
            .map(toListItem),
        )
        setCompletedEvents(
          summaries
            .filter((event) => event.status === 'COMPLETED')
            .map((event) => ({
              id: event.id,
              title: event.name,
              startDate: event.startDate,
              boardOrientation: event.boardOrientation ?? 'PORTRAIT',
              iconId: event.iconId || DEFAULT_EVENT_ICON_ID,
              boardEdited: event.boardEdited ?? false,
              mode: event.mode,
            })),
        )
      })
      .catch((error) => {
        console.error('GET /v1/events failed after leave', error)
      })
  }

  if (adventTarget !== null) {
    const settingsModal = (
      <EventSettingsModal
        isOpen={showEventSettings}
        eventId={adventTarget.id}
        eventTitle={adventTarget.title}
        eventMode={adventTarget.mode}
        eventIconId={adventTarget.iconId}
        boardOrientation={adventTarget.boardOrientation}
        boardEdited={adventTarget.boardEdited}
        onClose={() => setShowEventSettings(false)}
        onBoardOrientationSaved={handleBoardOrientationSaved}
        onEventNameSaved={handleEventNameSaved}
        onEventIconSaved={handleEventIconSaved}
        onLeftRoom={handleLeftRoom}
      />
    )
    const openSettings = () => setShowEventSettings(true)
    const openChat = (from: 'calendar' | 'stickers') => {
      setChatReturnView(from)
      setAdventView('chat')
    }

    if (adventView === 'chat') {
      return (
        <ChatView
          eventId={adventTarget.id}
          eventTitle={adventTarget.title}
          onBack={() => setAdventView(chatReturnView)}
        />
      )
    }

    if (adventView === 'board-edit') {
      return (
        <BoardEditPage
          boardOrientation={adventTarget.boardOrientation}
          onBack={() => setAdventView('stickers')}
        />
      )
    }

    if (adventView === 'stickers') {
      return (
        <>
          <StickerCollectionPage
            eventId={adventTarget.id}
            eventTitle={adventTarget.title}
            eventDate={adventTarget.startDate}
            boardOrientation={adventTarget.boardOrientation}
            onBack={() => setAdventView('calendar')}
            onOpenSettings={openSettings}
            onOpenBoardEdit={() => setAdventView('board-edit')}
            onOpenChat={() => openChat('stickers')}
          />
          {settingsModal}
        </>
      )
    }

    return (
      <>
        <AdventCalendar
          title={adventTarget.title}
          eventDate={adventTarget.startDate}
          onBack={() => {
            setShowShareInvite(false)
            setShowEventSettings(false)
            setAdventTarget(null)
          }}
          onOpenStickers={() => setAdventView('stickers')}
          onOpenSettings={openSettings}
          onOpenChat={() => openChat('calendar')}
        />
        <ShareInviteModal
          isOpen={showShareInvite}
          eventId={adventTarget.id}
          eventName={adventTarget.title}
          onClose={() => setShowShareInvite(false)}
        />
        {settingsModal}
      </>
    )
  }

  return (
    <div className="event-main">
      <Header iconUrl={profileIconUrl} onOpenProfile={onOpenProfile} />

      <main className="event-main__content">
        <div className="event-main__scroll-area">
          <section className="event-main__section event-main__section--events">
            <h2 className="page-title event-main__section-title">EVENT</h2>

            <EventList
              events={activeEvents}
              isLoading={isLoadingEvents}
              onOpenEventAdd={onOpenEventAdd}
              onSelectEvent={(event) =>
                setAdventTarget({
                  id: event.id,
                  title: event.title,
                  startDate: event.startDate,
                  boardOrientation: event.boardOrientation ?? 'PORTRAIT',
                  iconId: event.iconId || DEFAULT_EVENT_ICON_ID,
                  boardEdited: event.boardEdited ?? false,
                  mode: event.mode ?? 'GROUP',
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
                  memories={completedEvents}
                  isLoading={isLoadingEvents}
                  onSelectMemory={(memory) =>
                    setAdventTarget({
                      id: memory.id,
                      title: memory.title,
                      startDate: memory.startDate,
                      boardOrientation: memory.boardOrientation ?? 'PORTRAIT',
                      iconId: memory.iconId || DEFAULT_EVENT_ICON_ID,
                      boardEdited: memory.boardEdited ?? false,
                      mode: memory.mode ?? 'GROUP',
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
