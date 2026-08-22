import { useEffect, useRef, useState } from 'react'
import {
  Camera,
  ChevronLeft,
  Lightbulb,
  MessageCircle,
  Pencil,
  Settings,
} from 'lucide-react'
import { fetchBoard } from '../../services/boardService'
import {
  getEventCollections,
  type BoardOrientation,
  type CollectedSticker,
} from '../../services/eventApi'
import { formatMonthDay } from '../../utils/dateUtils'
import './StickerCollectionPage.css'

type StickerCollectionPageProps = {
  eventId: string
  eventTitle: string
  eventDate: string
  boardOrientation?: BoardOrientation
  onBack: () => void
  onOpenSettings?: () => void
  onOpenBoardEdit?: () => void
  onOpenChat?: () => void
}

function boardInnerClass(orientation?: BoardOrientation): string {
  return orientation === 'LANDSCAPE'
    ? 'event-board__card-inner--landscape'
    : 'event-board__card-inner--portrait'
}

const DEFAULT_TITLE_FONT_SIZE = 45

export function StickerCollectionPage({
  eventId,
  eventTitle,
  eventDate,
  boardOrientation = 'PORTRAIT',
  onBack,
  onOpenSettings,
  onOpenBoardEdit,
  onOpenChat,
}: StickerCollectionPageProps) {
  const [stickers, setStickers] = useState<CollectedSticker[]>([])
  const [boardImageData, setBoardImageData] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [titleFontSize, setTitleFontSize] = useState(DEFAULT_TITLE_FONT_SIZE)

  const titleRef = useRef<HTMLHeadingElement>(null)
  const boardRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const collections = await getEventCollections(
          eventId,
          controller.signal,
        )
        if (controller.signal.aborted) return
        setStickers(collections.stickers ?? [])
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('GET /v1/events/collections failed', error)
        setStickers([])
        setErrorMessage('ステッカーの取得に失敗しました')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }

      // ボード画像は別取得。失敗してもステッカー表示は落とさない。
      try {
        const board = await fetchBoard(eventId, controller.signal)
        if (controller.signal.aborted) return
        setBoardImageData(board.imageData || null)
      } catch (error) {
        if (controller.signal.aborted) return
        console.warn('board image load skipped', error)
        setBoardImageData(null)
      }
    }

    void load()

    return () => {
      controller.abort()
    }
  }, [eventId])

  useEffect(() => {
    const titleElement = titleRef.current
    const board = boardRef.current
    if (!titleElement || !board) return

    const adjustTitleSize = () => {
      const maxWidth = board.getBoundingClientRect().width
      const text = titleElement.textContent ?? ''
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (!context) return

      const computedStyle = window.getComputedStyle(titleElement)
      context.font = `${computedStyle.fontWeight} ${DEFAULT_TITLE_FONT_SIZE}px ${computedStyle.fontFamily}`
      const textWidth = context.measureText(text).width

      if (textWidth <= maxWidth) {
        setTitleFontSize(DEFAULT_TITLE_FONT_SIZE)
        return
      }

      const calculatedFontSize =
        DEFAULT_TITLE_FONT_SIZE * (maxWidth / textWidth) - 0.5
      setTitleFontSize(Math.max(20, calculatedFontSize))
    }

    let disposed = false

    adjustTitleSize()
    // Webフォントの読み込み前に測ると幅がずれるので、確定後にもう一度合わせる。
    void document.fonts.ready.then(() => {
      if (!disposed) adjustTitleSize()
    })

    window.addEventListener('resize', adjustTitleSize)
    const resizeObserver = new ResizeObserver(adjustTitleSize)
    resizeObserver.observe(board)

    return () => {
      disposed = true
      window.removeEventListener('resize', adjustTitleSize)
      resizeObserver.disconnect()
    }
  }, [eventTitle])

  const isBoardEmpty =
    !isLoading && !errorMessage && stickers.length === 0 && !boardImageData

  const openBoardEdit = () => {
    onOpenBoardEdit?.()
  }

  return (
    <div className="event-board">
      <button
        type="button"
        className="event-board__icon-button event-board__back-button"
        onClick={onBack}
        aria-label="戻る"
      >
        <ChevronLeft className="event-board__icon" size={28} strokeWidth={2} />
      </button>

      <div className="event-board__top-buttons">
        <button
          type="button"
          className="event-board__icon-button"
          aria-label="設定"
          onClick={onOpenSettings}
        >
          <Settings className="event-board__icon" size={24} strokeWidth={2} />
        </button>

        <button
          type="button"
          className="event-board__icon-button"
          aria-label="チャット"
          onClick={onOpenChat}
        >
          <MessageCircle className="event-board__icon" size={24} strokeWidth={2} />
        </button>
      </div>

      <div className="event-board__event-info">
        <p className="event-board__event-date">
          {formatMonthDay(eventDate)}
        </p>
        <h1
          ref={titleRef}
          className="event-board__event-title"
          style={{ fontSize: `${titleFontSize}px` }}
        >
          {eventTitle}
        </h1>
      </div>

      <section ref={boardRef} className="event-board__card">
        <p className="event-board__card-label">イベントボード</p>

        <div className={`event-board__card-inner ${boardInnerClass(boardOrientation)}`}>
          {isLoading ? (
            <p className="event-board__card-status">読み込み中…</p>
          ) : errorMessage ? (
            <p className="event-board__card-status event-board__card-status--error">
              {errorMessage}
            </p>
          ) : isBoardEmpty ? (
            <button
              type="button"
              className="event-board__empty-hint"
              onClick={openBoardEdit}
            >
              何も書かれていないなら
              <br />
              ここを押して編集しよう
            </button>
          ) : (
            <>
              {boardImageData ? (
                <img
                  src={boardImageData}
                  alt="保存済みのイベントボード"
                  className="event-board__saved-image"
                />
              ) : null}
              {stickers.length > 0 ? (
                <ul className="event-board__sticker-grid">
                  {stickers.map((item) => (
                    <li key={item.grantId} className="event-board__sticker-item">
                      {item.sticker.imageUrl ? (
                        <img
                          src={item.sticker.imageUrl}
                          alt={item.sticker.name}
                          className="event-board__sticker-image"
                        />
                      ) : (
                        <div
                          className="event-board__sticker-placeholder"
                          aria-hidden="true"
                        />
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}

          <button
            type="button"
            className="event-board__edit-button"
            aria-label="編集"
            onClick={openBoardEdit}
          >
            <Pencil className="event-board__icon" size={18} strokeWidth={2} />
          </button>
        </div>
      </section>

      <div className="event-board__actions">
        <button type="button" className="event-board__action-button">
          <Lightbulb className="event-board__action-icon" size={22} strokeWidth={2} />
          <span>豆知識を振り返る</span>
        </button>

        <button type="button" className="event-board__action-button">
          <Camera className="event-board__action-icon" size={22} strokeWidth={2} />
          <span>ベストショットを追加</span>
        </button>
      </div>
    </div>
  )
}
