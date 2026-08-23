import { useEffect, useState } from 'react'
import { Header } from '../../components/layout/Header'
import {
  listEvents,
  type BoardOrientation,
  type EventSummary,
} from '../../services/eventApi'
import { DEFAULT_EVENT_ICON_ID } from './EventNameField'
import { EventList, type EventListItem } from './EventList'
import { MemoriesPage, type MemoryItem } from '../memories/MemoriesPage'
import { ConstellationCalendar } from '../constellation-lab/components/ConstellationCalendar'
import { EventSettingsModal } from './EventSettingsModal'
import { ShareInviteModal } from './ShareInviteModal'
import { StickerCollectionPage } from './StickerCollectionPage'
import { BoardEditPage } from './BoardEditPage'
import { ChatView } from './ChatView'
import { InstallAppPrompt } from './InstallAppPrompt'
import type { User } from '../../types/user'

type EventMainPageProps = {
  currentUser: User | null
  profileIconUrl?: string | null
  eventsRefreshKey?: number
  pendingEvent?: EventSummary | null
  isEventPageActive?: boolean
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
  role: string
  source: 'event' | 'memory'
}

/*
 * サーバーの EventSummary を画面用の形に落とす。
 * boardOrientation / iconId / boardEdited は古いレスポンスで欠けることがあるので、
 * 既定値への寄せ方をここ一箇所にまとめる。
 */
function toMemoryItem(event: EventSummary): MemoryItem {
  return {
    id: event.id,
    title: event.name,
    startDate: event.startDate,
    boardOrientation: event.boardOrientation ?? 'PORTRAIT',
    iconId: event.iconId || DEFAULT_EVENT_ICON_ID,
    boardEdited: event.boardEdited ?? false,
    mode: event.mode,
    role: event.role,
  }
}

function toListItem(event: EventSummary): EventListItem {
  return {
    ...toMemoryItem(event),
    status: event.status,
    phase: event.phase,
  }
}

/** イベント日時が若い順（同じ日なら id で安定化） */
function byStartDateAsc<T extends { startDate: string; id: string }>(
  a: T,
  b: T,
): number {
  const byDate = a.startDate.localeCompare(b.startDate)
  if (byDate !== 0) return byDate
  return a.id.localeCompare(b.id)
}

function toAdventTarget(
  item: MemoryItem,
  source: 'event' | 'memory',
): AdventTarget {
  return {
    id: item.id,
    title: item.title,
    startDate: item.startDate,
    boardOrientation: item.boardOrientation,
    iconId: item.iconId,
    boardEdited: item.boardEdited,
    mode: item.mode,
    role: item.role,
    source,
  }
}

export function EventMainPage({
  currentUser,
  profileIconUrl = null,
  eventsRefreshKey = 0,
  pendingEvent = null,
  isEventPageActive = false,
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
  /* ルーム設定の保存(向き変更・ボード全消し)後にボードを取り直させるためのキー。 */
  const [boardRefreshKey, setBoardRefreshKey] = useState(0)
  const [showEventSettings, setShowEventSettings] = useState(false)
  const [isReflectionOpen, setIsReflectionOpen] = useState(true)
  const [activeEvents, setActiveEvents] = useState<EventListItem[]>([])
  const [completedEvents, setCompletedEvents] = useState<MemoryItem[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)

  /*
   * ボード系の画面はイベントを開いている間だけの状態なので、
   * 対象を開き直す・閉じるタイミングで必ずカレンダーに戻す。
   */
  const openAdventTarget = (item: MemoryItem, source: 'event' | 'memory') => {
    setAdventView('calendar')
    setAdventTarget(toAdventTarget(item, source))
  }

  const closeAdventTarget = () => {
    setAdventView('calendar')
    setShowShareInvite(false)
    setShowEventSettings(false)
    setAdventTarget(null)
  }

  useEffect(() => {
    onDetailOpenChange?.(
      adventTarget !== null,
    )
  }, [adventTarget, onDetailOpenChange])

  useEffect(() => {
    if (!pendingEvent) {
      return
    }

    setShowShareInvite(false)
    setAdventView('calendar')
    setAdventTarget(toAdventTarget(toMemoryItem(pendingEvent), 'event'))

    let openTimer: number | undefined
    const frameIds: number[] = []

    const firstFrame =
      window.requestAnimationFrame(() => {
        const secondFrame =
          window.requestAnimationFrame(() => {
            openTimer = window.setTimeout(() => {
              setShowShareInvite(true)
              onPendingEventConsumed?.()
            }, 300)
          })

        frameIds.push(secondFrame)
      })

    frameIds.push(firstFrame)

    return () => {
      frameIds.forEach((frameId) => {
        window.cancelAnimationFrame(frameId)
      })

      if (openTimer !== undefined) {
        window.clearTimeout(openTimer)
      }
    }
  }, [
    pendingEvent,
    onPendingEventConsumed,
  ])

  useEffect(() => {
    const controller =
      new AbortController()

    const load = async () => {
      setIsLoadingEvents(true)

      try {
        const summaries =
          await listEvents(
            controller.signal,
          )

        setActiveEvents(
          summaries
            .filter((event) => event.status === 'ACTIVE')
            .map(toListItem)
            .sort(byStartDateAsc),
        )

        setCompletedEvents(
          summaries
            .filter((event) => event.status === 'COMPLETED')
            .map(toMemoryItem)
            .sort(byStartDateAsc),
        )
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }

        console.error(
          'GET /v1/events failed',
          error,
        )

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

  /*
   * ルーム設定の保存結果を、開いているイベントと一覧の両方へ反映する。
   * 一覧を取り直さずに済ませたいので、対象IDの行だけ差し替える。
   */
  const handleEventSettingsSaved = (updated: {
    name: string
    iconId: string
    boardOrientation: BoardOrientation
    boardEdited: boolean
  }) => {
    const patch = {
      title: updated.name,
      iconId: updated.iconId,
      boardOrientation: updated.boardOrientation,
      boardEdited: updated.boardEdited,
    }

    setBoardRefreshKey((key) => key + 1)
    setAdventTarget((current) => (current ? { ...current, ...patch } : null))
    setActiveEvents((events) =>
      events.map((event) =>
        adventTarget && event.id === adventTarget.id
          ? { ...event, ...patch }
          : event,
      ),
    )
    setCompletedEvents((memories) =>
      memories.map((memory) =>
        adventTarget && memory.id === adventTarget.id
          ? { ...memory, ...patch }
          : memory,
      ),
    )
  }

  /*
   * ボードに1つでも描かれるとサーバー側で events.board_edited が立つ。
   * 向き変更時の「ボードを消す?」確認がこのフラグを見るので、開いている行にも反映する。
   */
  const handleBoardEditedChange = (boardEdited: boolean) => {
    /*
     * 呼び出し元は effect からこれを呼ぶ。ここで毎回 setState すると
     * 再レンダー → コールバックの同一性が変わる → effect 再実行、と回り続けるので、
     * 変化が無いときは何もしないで抜ける。
     */
    if (!adventTarget || adventTarget.boardEdited === boardEdited) return

    const targetId = adventTarget.id

    setAdventTarget((current) =>
      current && current.id === targetId ? { ...current, boardEdited } : current,
    )
    setActiveEvents((events) =>
      events.map((event) =>
        event.id === targetId ? { ...event, boardEdited } : event,
      ),
    )
    setCompletedEvents((memories) =>
      memories.map((memory) =>
        memory.id === targetId ? { ...memory, boardEdited } : memory,
      ),
    )
  }

  const handleLeftRoom = () => {
    closeAdventTarget()

    const controller = new AbortController()
    void listEvents(controller.signal)
      .then((summaries) => {
        setActiveEvents(
          summaries
            .filter((event) => event.status === 'ACTIVE')
            .map(toListItem)
            .sort(byStartDateAsc),
        )
        setCompletedEvents(
          summaries
            .filter((event) => event.status === 'COMPLETED')
            .map(toMemoryItem)
            .sort(byStartDateAsc),
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
        eventRole={adventTarget.role}
        eventIconId={adventTarget.iconId}
        boardOrientation={adventTarget.boardOrientation}
        boardEdited={adventTarget.boardEdited}
        onClose={() => setShowEventSettings(false)}
        onSaved={handleEventSettingsSaved}
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
          eventId={adventTarget.id}
          boardOrientation={adventTarget.boardOrientation}
          eventRole={adventTarget.role}
          refreshKey={boardRefreshKey}
          onBack={() => setAdventView('stickers')}
          onBoardEditedChange={handleBoardEditedChange}
        />
      )
    }

    if (adventView === 'stickers') {
      return (
        <>
          <StickerCollectionPage
            currentUser={currentUser}
            eventId={adventTarget.id}
            eventTitle={adventTarget.title}
            eventDate={adventTarget.startDate}
            boardOrientation={adventTarget.boardOrientation}
            refreshKey={boardRefreshKey}
            onBack={() => setAdventView('calendar')}
            onOpenSettings={openSettings}
            onOpenBoardEdit={() => setAdventView('board-edit')}
            onOpenChat={() => openChat('stickers')}
            onBoardEditedChange={handleBoardEditedChange}
          />
          {settingsModal}
        </>
      )
    }

    return (
      <>
        <ConstellationCalendar
          title={adventTarget.title}
          eventDate={adventTarget.startDate}
          eventId={adventTarget.id}
          onBack={closeAdventTarget}
          onOpenStickers={() => setAdventView('stickers')}
          onOpenSettings={openSettings}
          onOpenChat={() => openChat('calendar')}
          showDebug={false}
        />

        <ShareInviteModal
          isOpen={showShareInvite}
          eventId={adventTarget.id}
          eventName={adventTarget.title}
          onClose={() =>
            setShowShareInvite(false)
          }
        />
        {settingsModal}
      </>
    )
  }

  return (
    <div className="event-main">
      <Header
        iconUrl={profileIconUrl}
        onOpenProfile={onOpenProfile}
      />

      <main className="event-main__content">
        <div className="event-main__scroll-area">
          <section className="event-main__section event-main__section--events">
            <h2 className="page-title event-main__section-title">
              EVENT
            </h2>

            <EventList
              events={activeEvents}
              isLoading={isLoadingEvents}
              onOpenEventAdd={onOpenEventAdd}
              onSelectEvent={(event) => openAdventTarget(event, 'event')}
            />
          </section>

          <section className="event-main__section event-main__section--memories">
            <button
              type="button"
              className="event-main__section-toggle"
              onClick={() =>
                setIsReflectionOpen(
                  (open) => !open,
                )
              }
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
                  isReflectionOpen
                    ? ' is-open'
                    : ''
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
                    openAdventTarget(memory, 'memory')
                  }
                />
              </div>
            ) : null}
          </section>
        </div>
      </main>

      {/* イベント画面を開いているWebユーザーのみ表示 */}
      <InstallAppPrompt
        isActive={isEventPageActive}
      />
    </div>
  )
}
