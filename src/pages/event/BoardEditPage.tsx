import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Camera, ChevronLeft, Eraser, Pencil, Sticker } from 'lucide-react'
import { BoardCanvas } from '../../components/board/BoardCanvas'
import { BoardStickerPicker } from '../../components/board/BoardStickerPicker'
import { useBoard } from '../../hooks/useBoard'
import type { BoardItem, BoardPoint } from '../../services/boardApi'
import {
  getEventCollections,
  type BoardOrientation,
  type CollectedSticker,
} from '../../services/eventApi'
import './BoardEditPage.css'

type BoardEditPageProps = {
  eventId: string
  boardOrientation?: BoardOrientation
  /** イベント内の自分の役割。OWNER は他メンバーのアイテムも消せる。 */
  eventRole?: string
  /** ボード設定の保存などで再取得させたいときに変える。 */
  refreshKey?: number
  onBack: () => void
  /** 1つでも描かれたら events.board_edited が立つので、呼び出し元のキャッシュも更新する。 */
  onBoardEditedChange?: (boardEdited: boolean) => void
}

type Tool = 'pen' | 'eraser' | 'sticker' | 'camera'

const PEN_COLORS = ['#111111', '#e2483d', '#f0a92f', '#2f9e5a', '#2f6fe4']

const PEN_WIDTHS: { id: string; label: string; value: number }[] = [
  { id: 'thin', label: '細', value: 0.008 },
  { id: 'bold', label: '太', value: 0.02 },
]

/** ステッカーの既定サイズ(ボード幅に対する比率)。 */
const STICKER_SCALE = 0.18

/** 手貼りらしさを出すためのランダムな傾き(度)。 */
const STICKER_MAX_TILT = 8

/** これ未満しか動いていない移動は点として捨てる(点数を抑えるため)。 */
const MIN_POINT_DISTANCE = 0.004

function randomTilt(): number {
  return (Math.random() * 2 - 1) * STICKER_MAX_TILT
}

function distance(a: BoardPoint, b: BoardPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

const TOOLS: { id: Tool; label: string; icon: typeof Pencil }[] = [
  { id: 'pen', label: 'ペン', icon: Pencil },
  { id: 'eraser', label: '消しゴム', icon: Eraser },
  { id: 'sticker', label: 'ステッカー', icon: Sticker },
  { id: 'camera', label: 'カメラ', icon: Camera },
]

export function BoardEditPage({
  eventId,
  boardOrientation = 'PORTRAIT',
  eventRole,
  refreshKey = 0,
  onBack,
  onBoardEditedChange,
}: BoardEditPageProps) {
  const [activeTool, setActiveTool] = useState<Tool>('pen')
  const [penColor, setPenColor] = useState(PEN_COLORS[0])
  const [penWidth, setPenWidth] = useState(PEN_WIDTHS[0].value)
  const [selectedSticker, setSelectedSticker] =
    useState<CollectedSticker | null>(null)
  const [stickers, setStickers] = useState<CollectedSticker[]>([])
  const [isLoadingStickers, setIsLoadingStickers] = useState(true)
  const [stickersError, setStickersError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  const [draftPoints, setDraftPoints] = useState<BoardPoint[]>([])
  const [draftSticker, setDraftSticker] = useState<{
    imageUrl: string
    x: number
    y: number
    scale: number
    rotation: number
  } | null>(null)

  /** 描画中のポインタ。点の蓄積は再描画を挟まずに ref で持つ。 */
  const strokeRef = useRef<{ pointerId: number; points: BoardPoint[] } | null>(
    null,
  )
  const placingRef = useRef<{ pointerId: number; rotation: number } | null>(null)

  const {
    items,
    orientation,
    boardEdited,
    isLoading,
    error,
    pendingCount,
    currentUserId,
    addStroke,
    addSticker,
    removeItem,
  } = useBoard(eventId, refreshKey)

  const effectiveOrientation = orientation ?? boardOrientation
  const isOwner = eventRole === 'OWNER'

  useEffect(() => {
    if (boardEdited) {
      onBoardEditedChange?.(true)
    }
  }, [boardEdited, onBoardEditedChange])

  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      setIsLoadingStickers(true)
      setStickersError(null)

      try {
        const collections = await getEventCollections(eventId, controller.signal)
        setStickers(collections.stickers ?? [])
      } catch (loadError) {
        if (controller.signal.aborted) return
        console.error('GET /v1/events/collections failed', loadError)
        setStickers([])
        setStickersError('ステッカーの取得に失敗しました')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingStickers(false)
        }
      }
    }

    void load()

    return () => {
      controller.abort()
    }
  }, [eventId])

  const canDeleteItem = useCallback(
    (item: BoardItem) =>
      !item.pending &&
      (isOwner || (currentUserId !== null && item.createdBy.id === currentUserId)),
    [currentUserId, isOwner],
  )

  const handlePickItem = useCallback(
    (item: BoardItem) => {
      if (!canDeleteItem(item)) return
      setHint(null)
      void removeItem(item).catch(() => {
        // エラー表示は useBoard の error 側で行う。
      })
    },
    [canDeleteItem, removeItem],
  )

  const handlePointerDown = useCallback(
    (point: BoardPoint, event: ReactPointerEvent<SVGSVGElement>) => {
      if (activeTool === 'pen') {
        event.currentTarget.setPointerCapture(event.pointerId)
        strokeRef.current = { pointerId: event.pointerId, points: [point] }
        setDraftPoints([point])
        return
      }

      if (activeTool === 'sticker') {
        if (!selectedSticker) {
          setHint('下のリストから貼りたいステッカーを選んでね')
          return
        }

        event.currentTarget.setPointerCapture(event.pointerId)
        const rotation = randomTilt()
        placingRef.current = { pointerId: event.pointerId, rotation }
        setHint(null)
        setDraftSticker({
          imageUrl: selectedSticker.sticker.imageUrl,
          x: point.x,
          y: point.y,
          scale: STICKER_SCALE,
          rotation,
        })
      }
    },
    [activeTool, selectedSticker],
  )

  const handlePointerMove = useCallback(
    (point: BoardPoint, event: ReactPointerEvent<SVGSVGElement>) => {
      const stroke = strokeRef.current
      if (stroke && stroke.pointerId === event.pointerId) {
        const last = stroke.points[stroke.points.length - 1]
        if (distance(last, point) < MIN_POINT_DISTANCE) return
        stroke.points.push(point)
        setDraftPoints([...stroke.points])
        return
      }

      const placing = placingRef.current
      if (placing && placing.pointerId === event.pointerId) {
        // 指を離すまでは位置合わせだけ。POST は pointerup で1回だけ。
        setDraftSticker((current) =>
          current ? { ...current, x: point.x, y: point.y } : current,
        )
      }
    },
    [],
  )

  const handlePointerUp = useCallback(
    (point: BoardPoint, event: ReactPointerEvent<SVGSVGElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      const stroke = strokeRef.current
      if (stroke && stroke.pointerId === event.pointerId) {
        strokeRef.current = null
        setDraftPoints([])

        const points = [...stroke.points]
        const last = points[points.length - 1]
        if (distance(last, point) >= MIN_POINT_DISTANCE) {
          points.push(point)
        }
        // タップだけのときは同じ点を2つにして「点を打った」線にする(契約の最小2点)。
        if (points.length === 1) {
          points.push(points[0])
        }

        void addStroke({ points, color: penColor, width: penWidth }).catch(() => {
          // エラー表示は useBoard の error 側で行う。
        })
        return
      }

      const placing = placingRef.current
      if (placing && placing.pointerId === event.pointerId) {
        placingRef.current = null
        const sticker = selectedSticker
        setDraftSticker(null)

        if (!sticker) return

        void addSticker({
          stickerId: sticker.sticker.id,
          imageUrl: sticker.sticker.imageUrl,
          x: point.x,
          y: point.y,
          scale: STICKER_SCALE,
          rotation: placing.rotation,
        }).catch(() => {
          // エラー表示は useBoard の error 側で行う。
        })
      }
    },
    [addSticker, addStroke, penColor, penWidth, selectedSticker],
  )

  const selectTool = (tool: Tool) => {
    setActiveTool(tool)
    setHint(null)
    strokeRef.current = null
    placingRef.current = null
    setDraftPoints([])
    setDraftSticker(null)
  }

  const isCanvasInteractive = activeTool !== 'camera' && !isLoading

  const statusMessage = error
    ? error
    : pendingCount > 0
      ? '保存中…'
      : isLoading
        ? '読み込み中…'
        : hint

  return (
    <div className="board-edit">
      <header className="board-edit__header">
        <button
          type="button"
          className="board-edit__back-button"
          onClick={onBack}
          aria-label="戻る"
        >
          <ChevronLeft size={28} strokeWidth={2} />
        </button>
        <h1 className="board-edit__title">編集</h1>
      </header>

      <p
        className={`board-edit__status${
          error ? ' board-edit__status--error' : ''
        }`}
        role="status"
      >
        {statusMessage ?? ''}
      </p>

      <main className="board-edit__main">
        <BoardCanvas
          className="board-edit__canvas"
          orientation={effectiveOrientation}
          items={items}
          interactive={isCanvasInteractive}
          draftStroke={
            draftPoints.length > 0
              ? { points: draftPoints, color: penColor, width: penWidth }
              : null
          }
          draftSticker={draftSticker}
          isItemPickable={activeTool === 'eraser' ? canDeleteItem : undefined}
          onPickItem={activeTool === 'eraser' ? handlePickItem : undefined}
          dimUnpickableItems={activeTool === 'eraser'}
          onBoardPointerDown={handlePointerDown}
          onBoardPointerMove={handlePointerMove}
          onBoardPointerUp={handlePointerUp}
          emptyContent={
            <span className="board-edit__empty">
              ここに描いたり
              <br />
              ステッカーを貼ろう
            </span>
          }
        />
      </main>

      <section className="board-edit__panel" aria-label={`${activeTool}の設定`}>
        {activeTool === 'pen' ? (
          <div className="board-edit__pen-options">
            <div className="board-edit__swatches">
              {PEN_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`board-edit__swatch${
                    penColor === color ? ' board-edit__swatch--active' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`色 ${color}`}
                  aria-pressed={penColor === color}
                  onClick={() => setPenColor(color)}
                />
              ))}
            </div>

            <div className="board-edit__widths">
              {PEN_WIDTHS.map((width) => (
                <button
                  key={width.id}
                  type="button"
                  className={`board-edit__width${
                    penWidth === width.value ? ' board-edit__width--active' : ''
                  }`}
                  aria-pressed={penWidth === width.value}
                  onClick={() => setPenWidth(width.value)}
                >
                  {width.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {activeTool === 'sticker' ? (
          <div className="board-picker">
            <BoardStickerPicker
              stickers={stickers}
              isLoading={isLoadingStickers}
              errorMessage={stickersError}
              selectedStickerId={selectedSticker?.sticker.id ?? null}
              onSelect={setSelectedSticker}
            />
          </div>
        ) : null}

        {activeTool === 'eraser' ? (
          <p className="board-edit__note">
            {isOwner
              ? '消したいものをタップ(オーナーはみんなの分を消せます)'
              : '消したいものをタップ(自分が描いたものだけ消せます)'}
          </p>
        ) : null}

        {activeTool === 'camera' ? (
          <p className="board-edit__note">写真の追加は近日対応</p>
        ) : null}
      </section>

      <footer className="board-edit__toolbar">
        {TOOLS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`board-edit__tool-button${
              activeTool === id ? ' board-edit__tool-button--active' : ''
            }`}
            aria-label={label}
            aria-pressed={activeTool === id}
            onClick={() => selectTool(id)}
          >
            <Icon size={22} strokeWidth={2} />
          </button>
        ))}
      </footer>
    </div>
  )
}
