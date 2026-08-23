import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  Camera,
  ChevronLeft,
  Lightbulb,
  MessageCircle,
  Pencil,
  Settings,
} from 'lucide-react'
import { BoardCanvas } from '../../components/board/BoardCanvas'
import { useBoard } from '../../hooks/useBoard'
import { ApiError } from '../../services/apiClient'
import { uploadBestShot } from '../../services/bestShotStorage'
import {
  getEventBestShots,
  getEventCollections,
  putMyBestShot,
  type BoardOrientation,
  type BestShot,
  type CollectedSticker,
} from '../../services/eventApi'
import type { User } from '../../types/user'
import { formatMonthDay } from '../../utils/dateUtils'
import './StickerCollectionPage.css'

type StickerCollectionPageProps = {
  currentUser: User | null
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
  currentUser,
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
  const [stickers, setStickers] = useState<CollectedSticker[]>([])
  const [bestShots, setBestShots] = useState<BestShot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingBestShots, setIsLoadingBestShots] = useState(true)
  const [isUploadingBestShot, setIsUploadingBestShot] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [bestShotError, setBestShotError] = useState<string | null>(null)
  const [titleFontSize, setTitleFontSize] = useState(DEFAULT_TITLE_FONT_SIZE)

  const titleRef = useRef<HTMLHeadingElement>(null)
  const boardRef = useRef<HTMLElement>(null)
  const bestShotInputRef = useRef<HTMLInputElement>(null)

  /*
   * ボードの実体(線・ステッカー)はここでは読み取り専用。
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
    const controller = new AbortController()

    const load = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const collections = await getEventCollections(
          eventId,
          controller.signal,
        )
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
    }

    void load()

    return () => {
      controller.abort()
    }
  }, [eventId])

  useEffect(() => {
    const controller = new AbortController()

    const loadBestShots = async () => {
      await Promise.resolve()
      if (controller.signal.aborted) return
      setIsLoadingBestShots(true)
      setBestShotError(null)

      try {
        const response = await getEventBestShots(eventId, controller.signal)
        setBestShots(response.shots ?? [])
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('GET /v1/events/best-shots failed', error)
        setBestShots([])
        setBestShotError(
          error instanceof ApiError && error.status === 404
            ? 'ベストショットAPIが未デプロイです'
            : 'ベストショットの取得に失敗しました',
        )
      } finally {
        if (!controller.signal.aborted) setIsLoadingBestShots(false)
      }
    }

    void loadBestShots()

    return () => controller.abort()
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

  const isBusy = isLoading || isBoardLoading
  const statusMessage = boardError ?? errorMessage
  const hasBoardItems = boardItems.length > 0
  /* ボードに何も無く、獲得ステッカーも無い状態だけ「編集しよう」の案内を出す。 */
  const isBoardEmpty =
    !isBusy && !statusMessage && !hasBoardItems && stickers.length === 0

  const openBoardEdit = () => {
    onOpenBoardEdit?.()
  }

  const myBestShot = currentUser
    ? bestShots.find((shot) => shot.user.id === currentUser.id)
    : undefined

  const onBestShotFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!currentUser) {
      setBestShotError('ログイン情報を取得できませんでした')
      return
    }
    if (!file.type.startsWith('image/')) {
      setBestShotError('画像ファイルを選択してください')
      return
    }

    setIsUploadingBestShot(true)
    setBestShotError(null)
    try {
      const imagePath = await uploadBestShot(eventId, currentUser.id, file)
      const saved = await putMyBestShot(eventId, imagePath)
      setBestShots((shots) => [
        ...shots.filter((shot) => shot.user.id !== currentUser.id),
        saved,
      ])
    } catch (error) {
      console.error('best shot upload failed', error)
      setBestShotError(
        error instanceof Error
          ? error.message
          : 'ベストショットの追加に失敗しました',
      )
    } finally {
      setIsUploadingBestShot(false)
    }
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
          {isBusy ? (
            <p className="event-board__card-status">読み込み中…</p>
          ) : statusMessage ? (
            <p className="event-board__card-status event-board__card-status--error">
              {statusMessage}
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
          ) : (
            /* ボードはまだ空なので、獲得済みステッカーの一覧を出しておく。 */
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

      <section className="event-board__best-shots" aria-label="ベストショット">
        <p className="event-board__best-shots-label">ベストショット</p>
        {isLoadingBestShots ? (
          <p className="event-board__best-shots-status">読み込み中…</p>
        ) : bestShotError ? (
          <p className="event-board__best-shots-error">{bestShotError}</p>
        ) : bestShots.length === 0 ? (
          <p className="event-board__best-shots-status">まだ投稿がありません</p>
        ) : (
          <ul className="event-board__best-shot-grid">
            {bestShots.map((shot) => (
              <li key={shot.id} className="event-board__best-shot-item">
                <img
                  src={shot.imageUrl}
                  alt={`${shot.user.displayName}のベストショット`}
                  className="event-board__best-shot-image"
                />
                <p className="event-board__best-shot-name">
                  {shot.user.displayName}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="event-board__actions">
        <button type="button" className="event-board__action-button">
          <Lightbulb className="event-board__action-icon" size={22} strokeWidth={2} />
          <span>豆知識を振り返る</span>
        </button>

        <input
          ref={bestShotInputRef}
          type="file"
          accept="image/*"
          className="event-board__best-shot-input"
          onChange={onBestShotFileChange}
        />
        <button
          type="button"
          className="event-board__action-button"
          disabled={isUploadingBestShot || !currentUser}
          onClick={() => bestShotInputRef.current?.click()}
        >
          <Camera className="event-board__action-icon" size={22} strokeWidth={2} />
          <span>
            {isUploadingBestShot
              ? 'アップロード中…'
              : myBestShot
                ? 'ベストショットを変更'
                : 'ベストショットを追加'}
          </span>
        </button>
      </div>
    </div>
  )
}
