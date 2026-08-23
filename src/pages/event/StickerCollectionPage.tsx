import { useEffect, useRef, useState } from 'react'
import {
  Camera,
  ChevronLeft,
  MessageCircle,
  Pencil,
  Settings,
} from 'lucide-react'
import { BoardCanvas } from '../../components/board/BoardCanvas'
import { useBoard } from '../../hooks/useBoard'
import type { BoardOrientation } from '../../services/eventApi'
import { formatMonthDay } from '../../utils/dateUtils'
import './StickerCollectionPage.css'

type StickerCollectionPageProps = {
  eventId: string
  eventTitle: string
  eventDate: string
  boardOrientation?: BoardOrientation
  /** ボード設定の保存などで再取得させたいときに変える。 */
  refreshKey?: number
  onBack: () => void
  onOpenSettings?: () => void
  onOpenBoardEdit?: () => void
  onOpenChat?: () => void
  /** ボードに何か描かれている状態を呼び出し元のキャッシュへ反映する。 */
  onBoardEditedChange?: (boardEdited: boolean) => void
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
  refreshKey = 0,
  onBack,
  onOpenSettings,
  onOpenBoardEdit,
  onOpenChat,
  onBoardEditedChange,
}: StickerCollectionPageProps) {
  const [titleFontSize, setTitleFontSize] = useState(DEFAULT_TITLE_FONT_SIZE)

  const titleRef = useRef<HTMLHeadingElement>(null)
  const boardRef = useRef<HTMLElement>(null)

  /*
   * ボードの実体(線・貼ったステッカー)はここでは読み取り専用。
   * 編集画面と同じ useBoard を使うので、他メンバーの追加/削除もそのまま反映される。
   */
  const {
    items: boardItems,
    orientation: serverOrientation,
    boardEdited,
    isLoading: isBoardLoading,
    error: boardError,
  } = useBoard(eventId, refreshKey)

  useEffect(() => {
    if (boardEdited) {
      onBoardEditedChange?.(true)
    }
  }, [boardEdited, onBoardEditedChange])

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

  const hasBoardItems = boardItems.length > 0
  const isBoardEmpty = !isBoardLoading && !boardError && !hasBoardItems

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

        <div
          className={`event-board__card-inner ${boardInnerClass(
            serverOrientation ?? boardOrientation,
          )}`}
        >
          {isBoardLoading ? (
            <p className="event-board__card-status">読み込み中…</p>
          ) : boardError ? (
            <p className="event-board__card-status event-board__card-status--error">
              {boardError}
            </p>
          ) : hasBoardItems ? (
            <BoardCanvas
              className="event-board__canvas"
              orientation={serverOrientation ?? boardOrientation}
              items={boardItems}
              ariaLabel="イベントボードの内容"
            />
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
          ) : null}

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
          <Camera className="event-board__action-icon" size={22} strokeWidth={2} />
          <span>ベストショットを追加</span>
        </button>
      </div>
    </div>
  )
}
