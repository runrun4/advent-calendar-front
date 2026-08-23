import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react'
import {
  ChevronLeft,
  Eraser,
  Image as ImageIcon,
  Pencil,
  Sticker,
  Undo2,
} from 'lucide-react'
import { BoardCanvas } from '../../components/board/BoardCanvas'
import { Modal } from '../../components/common/Modal'
import { useBoard } from '../../hooks/useBoard'
import {
  BOARD_LIMITS,
  buildBoardFillPoints,
  type BoardItem,
  type BoardPoint,
} from '../../services/boardApi'
import {
  getEventBestShots,
  getEventCollections,
  type BestShot,
  type BoardOrientation,
  type CollectedSticker,
} from '../../services/eventApi'
import { ApiError } from '../../services/apiClient'
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

type Tool = 'pen' | 'eraser' | 'sticker' | 'photo'

type SelectedStickerPlaceable = {
  kind: 'sticker'
  collected: CollectedSticker
}

type SelectedPhotoPlaceable = {
  kind: 'photo'
  shot: BestShot
}

type SelectedPlaceable = SelectedStickerPlaceable | SelectedPhotoPlaceable

type PickerSheet = 'sticker' | 'photo' | null

/** ペンパレットの初期7色（各スロットは再タップで上書き保存できる） */
const DEFAULT_PEN_PALETTE = [
  '#1f1f1f',
  '#e53935',
  '#fb8c00',
  '#fdd835',
  '#43a047',
  '#1e88e5',
  '#8e24aa',
] as const

const PALETTE_SLOT_COUNT = DEFAULT_PEN_PALETTE.length
const PALETTE_STORAGE_KEY = 'board-edit:pen-palette'

const PEN_SLIDER_MIN = 2
const PEN_SLIDER_MAX = 24

/** ステッカーの既定サイズ(ボード幅に対する比率)。 */
const STICKER_SCALE = 0.18

/** ベストショット写真の既定サイズ(ボード幅に対する比率)。 */
const PHOTO_SCALE = 0.28

/** 手貼りらしさを出すためのランダムな傾き(度)。 */
const STICKER_MAX_TILT = 8

/** これ未満しか動いていない移動は点として捨てる(点数を抑えるため)。 */
const MIN_POINT_DISTANCE = 0.004

/** ペン選択時、ボード長押しで全面塗り */
const BOARD_FILL_LONG_PRESS_MS = 500

/** 長押し判定をキャンセルする移動量（正規化座標） */
const LONG_PRESS_MOVE_THRESHOLD = 0.012

const MAX_UNDO_STEPS = 40

function resolveBestShotImagePath(shot: BestShot): string {
  if (shot.imagePath) return shot.imagePath
  const marker = '/storage/v1/object/public/best-shots/'
  const index = shot.imageUrl.indexOf(marker)
  if (index < 0) return ''
  try {
    return decodeURIComponent(shot.imageUrl.slice(index + marker.length))
  } catch {
    return shot.imageUrl.slice(index + marker.length)
  }
}

function randomTilt(): number {
  return (Math.random() * 2 - 1) * STICKER_MAX_TILT
}

function distance(a: BoardPoint, b: BoardPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function sliderToStrokeWidth(sliderValue: number): number {
  const { strokeMinWidth, strokeMaxWidth } = BOARD_LIMITS
  const t =
    (sliderValue - PEN_SLIDER_MIN) / (PEN_SLIDER_MAX - PEN_SLIDER_MIN)
  return strokeMinWidth + t * (strokeMaxWidth - strokeMinWidth)
}

function strokeWidthToSlider(width: number): number {
  const { strokeMinWidth, strokeMaxWidth } = BOARD_LIMITS
  const t = (width - strokeMinWidth) / (strokeMaxWidth - strokeMinWidth)
  return Math.round(
    PEN_SLIDER_MIN + t * (PEN_SLIDER_MAX - PEN_SLIDER_MIN),
  )
}

function loadPalette(): string[] {
  try {
    const stored = localStorage.getItem(PALETTE_STORAGE_KEY)
    if (!stored) return [...DEFAULT_PEN_PALETTE]
    const colors = JSON.parse(stored)
    if (
      !Array.isArray(colors) ||
      colors.length !== PALETTE_SLOT_COUNT ||
      !colors.every(
        (color) => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color),
      )
    ) {
      return [...DEFAULT_PEN_PALETTE]
    }
    return colors
  } catch {
    return [...DEFAULT_PEN_PALETTE]
  }
}

const TOOLS: { id: Tool; label: string; icon: typeof Pencil }[] = [
  { id: 'pen', label: 'ペン', icon: Pencil },
  { id: 'eraser', label: '消しゴム', icon: Eraser },
  { id: 'sticker', label: 'ステッカー', icon: Sticker },
  { id: 'photo', label: '写真', icon: ImageIcon },
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
  const [paletteColors, setPaletteColors] = useState<string[]>(loadPalette)
  const [selectedPaletteIndex, setSelectedPaletteIndex] = useState(0)
  const penColor =
    paletteColors[selectedPaletteIndex] ?? DEFAULT_PEN_PALETTE[0]
  const [penSizeSlider, setPenSizeSlider] = useState(
    strokeWidthToSlider(0.008),
  )
  const penWidth = sliderToStrokeWidth(penSizeSlider)
  const [selectedPlaceable, setSelectedPlaceable] =
    useState<SelectedPlaceable | null>(null)
  const [pickerSheet, setPickerSheet] = useState<PickerSheet>(null)
  const [stickers, setStickers] = useState<CollectedSticker[]>([])
  const [isLoadingStickers, setIsLoadingStickers] = useState(true)
  const [stickersError, setStickersError] = useState<string | null>(null)
  const [photos, setPhotos] = useState<BestShot[]>([])
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true)
  const [photosError, setPhotosError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [canUndo, setCanUndo] = useState(false)

  const [draftPoints, setDraftPoints] = useState<BoardPoint[]>([])
  const [draftSticker, setDraftSticker] = useState<{
    imageUrl: string
    x: number
    y: number
    scale: number
    rotation: number
  } | null>(null)
  const [draftFillColor, setDraftFillColor] = useState<string | null>(null)

  /** 描画中のポインタ。点の蓄積は再描画を挟まずに ref で持つ。 */
  const strokeRef = useRef<{ pointerId: number; points: BoardPoint[] } | null>(
    null,
  )
  const placingRef = useRef<{ pointerId: number; rotation: number } | null>(null)
  const undoStackRef = useRef<BoardItem[]>([])
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFilledRef = useRef(false)
  const pointerDownPointRef = useRef<BoardPoint | null>(null)

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
    addPhoto,
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
    try {
      localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(paletteColors))
    } catch {
      // プライベートモード等で保存できなくても描画操作は継続する。
    }
  }, [paletteColors])

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
        setStickersError(
          loadError instanceof ApiError
            ? `ステッカーの取得に失敗しました (${loadError.message})`
            : 'ステッカーの取得に失敗しました',
        )
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

  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      setIsLoadingPhotos(true)
      setPhotosError(null)

      try {
        const result = await getEventBestShots(eventId, controller.signal)
        setPhotos(result.shots ?? [])
      } catch (loadError) {
        if (controller.signal.aborted) return
        console.error('GET /v1/events/best-shots failed', loadError)
        setPhotos([])
        setPhotosError(
          loadError instanceof ApiError
            ? `写真の取得に失敗しました (${loadError.message})`
            : '写真の取得に失敗しました',
        )
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingPhotos(false)
        }
      }
    }

    void load()

    return () => {
      controller.abort()
    }
  }, [eventId])

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => clearLongPressTimer()
  }, [clearLongPressTimer])

  const pushUndoItem = useCallback((item: BoardItem) => {
    undoStackRef.current.push(item)
    if (undoStackRef.current.length > MAX_UNDO_STEPS) {
      undoStackRef.current.shift()
    }
    setCanUndo(true)
  }, [])

  const handleUndo = useCallback(() => {
    while (undoStackRef.current.length > 0) {
      const target = undoStackRef.current.pop()
      if (!target || target.pending) {
        continue
      }

      setCanUndo(undoStackRef.current.length > 0)
      void removeItem(target).catch(() => {
        undoStackRef.current.push(target)
        setCanUndo(true)
      })
      return
    }

    setCanUndo(false)
  }, [removeItem])

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

  const fillBoardWithPenColor = useCallback(() => {
    longPressFilledRef.current = true
    strokeRef.current = null
    setDraftPoints([])
    setDraftFillColor(penColor)
    setHint(null)

    void addStroke({
      points: buildBoardFillPoints(),
      color: penColor,
      width: BOARD_LIMITS.strokeMaxWidth,
    })
      .then((saved) => {
        pushUndoItem(saved)
        setDraftFillColor(null)
      })
      .catch(() => {
        setDraftFillColor(null)
      })
  }, [addStroke, penColor, pushUndoItem])

  const startStrokeFromPoint = useCallback((point: BoardPoint, pointerId: number) => {
    strokeRef.current = { pointerId, points: [point] }
    setDraftPoints([point])
  }, [])

  const handlePointerDown = useCallback(
    (point: BoardPoint, event: ReactPointerEvent<SVGSVGElement>) => {
      if (activeTool === 'pen') {
        event.currentTarget.setPointerCapture(event.pointerId)
        clearLongPressTimer()
        longPressFilledRef.current = false
        pointerDownPointRef.current = point
        strokeRef.current = null
        setDraftPoints([])

        longPressTimerRef.current = setTimeout(() => {
          longPressTimerRef.current = null
          fillBoardWithPenColor()
        }, BOARD_FILL_LONG_PRESS_MS)
        return
      }

      if (activeTool === 'sticker' || activeTool === 'photo') {
        if (!selectedPlaceable || selectedPlaceable.kind !== activeTool) {
          setHint(
            activeTool === 'sticker'
              ? 'ステッカーを選んでからボードに貼ろう'
              : '写真を選んでからボードに貼ろう',
          )
          setPickerSheet(activeTool)
          return
        }

        event.currentTarget.setPointerCapture(event.pointerId)
        const rotation = randomTilt()
        placingRef.current = { pointerId: event.pointerId, rotation }
        setHint(null)
        setDraftSticker({
          imageUrl:
            selectedPlaceable.kind === 'sticker'
              ? selectedPlaceable.collected.sticker.imageUrl
              : selectedPlaceable.shot.imageUrl,
          x: point.x,
          y: point.y,
          scale:
            selectedPlaceable.kind === 'sticker' ? STICKER_SCALE : PHOTO_SCALE,
          rotation,
        })
      }
    },
    [
      activeTool,
      clearLongPressTimer,
      fillBoardWithPenColor,
      selectedPlaceable,
    ],
  )

  const handlePointerMove = useCallback(
    (point: BoardPoint, event: ReactPointerEvent<SVGSVGElement>) => {
      if (
        longPressTimerRef.current !== null &&
        pointerDownPointRef.current &&
        activeTool === 'pen'
      ) {
        const moved =
          distance(pointerDownPointRef.current, point) >
          LONG_PRESS_MOVE_THRESHOLD

        if (moved) {
          clearLongPressTimer()
          if (!longPressFilledRef.current) {
            startStrokeFromPoint(pointerDownPointRef.current, event.pointerId)
            const stroke = strokeRef.current
            if (stroke) {
              stroke.points.push(point)
              setDraftPoints([...stroke.points])
            }
          }
        }
        return
      }

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
    [activeTool, clearLongPressTimer, startStrokeFromPoint],
  )

  const handlePointerUp = useCallback(
    (point: BoardPoint, event: ReactPointerEvent<SVGSVGElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      const wasLongPressPending = longPressTimerRef.current !== null
      clearLongPressTimer()

      if (longPressFilledRef.current) {
        longPressFilledRef.current = false
        pointerDownPointRef.current = null
        strokeRef.current = null
        setDraftPoints([])
        return
      }

      const stroke = strokeRef.current
      if (stroke && stroke.pointerId === event.pointerId) {
        strokeRef.current = null
        setDraftPoints([])
        pointerDownPointRef.current = null

        const points = [...stroke.points]
        const last = points[points.length - 1]
        if (distance(last, point) >= MIN_POINT_DISTANCE) {
          points.push(point)
        }
        // タップだけのときは同じ点を2つにして「点を打った」線にする(契約の最小2点)。
        if (points.length === 1) {
          points.push(points[0])
        }

        void addStroke({ points, color: penColor, width: penWidth })
          .then((saved) => {
            pushUndoItem(saved)
          })
          .catch(() => {
            // エラー表示は useBoard の error 側で行う。
          })
        return
      }

      // 長押し待ちのまま離した＝短いタップ。点を打つ。
      if (
        wasLongPressPending &&
        activeTool === 'pen' &&
        pointerDownPointRef.current
      ) {
        const tapPoint = pointerDownPointRef.current
        pointerDownPointRef.current = null
        void addStroke({
          points: [tapPoint, tapPoint],
          color: penColor,
          width: penWidth,
        })
          .then((saved) => {
            pushUndoItem(saved)
          })
          .catch(() => {
            // エラー表示は useBoard の error 側で行う。
          })
        return
      }

      pointerDownPointRef.current = null

      const placing = placingRef.current
      if (placing && placing.pointerId === event.pointerId) {
        placingRef.current = null
        const placeable = selectedPlaceable
        setDraftSticker(null)

        if (!placeable) return

        if (placeable.kind === 'sticker') {
          void addSticker({
            stickerId: placeable.collected.sticker.id,
            imageUrl: placeable.collected.sticker.imageUrl,
            x: point.x,
            y: point.y,
            scale: STICKER_SCALE,
            rotation: placing.rotation,
          })
            .then((saved) => {
              pushUndoItem(saved)
            })
            .catch(() => {
              // エラー表示は useBoard の error 側で行う。
            })
          return
        }

        void addPhoto({
          imagePath: resolveBestShotImagePath(placeable.shot),
          imageUrl: placeable.shot.imageUrl,
          x: point.x,
          y: point.y,
          scale: PHOTO_SCALE,
          rotation: placing.rotation,
        })
          .then((saved) => {
            pushUndoItem(saved)
          })
          .catch(() => {
            // エラー表示は useBoard の error 側で行う。
          })
      }
    },
    [
      activeTool,
      addPhoto,
      addSticker,
      addStroke,
      clearLongPressTimer,
      penColor,
      penWidth,
      pushUndoItem,
      selectedPlaceable,
    ],
  )

  const selectTool = (tool: Tool) => {
    clearLongPressTimer()
    setActiveTool(tool)
    setHint(null)
    strokeRef.current = null
    placingRef.current = null
    pointerDownPointRef.current = null
    setDraftPoints([])
    setDraftSticker(null)
    setDraftFillColor(null)

    if (tool === 'sticker' || tool === 'photo') {
      const matchesSelection =
        selectedPlaceable !== null && selectedPlaceable.kind === tool
      if (!matchesSelection) {
        setSelectedPlaceable(null)
      }
      setPickerSheet(tool)
      return
    }

    setPickerSheet(null)
    setSelectedPlaceable(null)
  }

  const handleStickerSelect = (collected: CollectedSticker) => {
    setSelectedPlaceable({ kind: 'sticker', collected })
    setPickerSheet(null)
    setHint('ボードをタップして貼ろう')
  }

  const handlePhotoSelect = (shot: BestShot) => {
    if (!resolveBestShotImagePath(shot)) {
      setHint('この写真はまだ貼れません')
      return
    }
    setSelectedPlaceable({ kind: 'photo', shot })
    setPickerSheet(null)
    setHint('ボードをタップして貼ろう')
  }

  const handlePenSizeChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPenSizeSlider(Number(event.target.value))
  }

  const paletteInputRefs = useRef<(HTMLInputElement | null)[]>([])

  /** 1回目は選択のみ。選択済みスロットの2回目でカラーピッカーを開く。 */
  const handlePaletteSwatchClick = (index: number) => {
    if (isLoading) return

    if (selectedPaletteIndex !== index) {
      setSelectedPaletteIndex(index)
      return
    }

    const input = paletteInputRefs.current[index]
    if (!input) return

    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker()
        return
      } catch {
        // showPicker 非対応時は click にフォールバック
      }
    }
    input.click()
  }

  const handlePaletteColorChange = (
    index: number,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const nextColor = event.target.value
    setPaletteColors((prev) => {
      const next = [...prev]
      next[index] = nextColor
      return next
    })
    setSelectedPaletteIndex(index)
  }

  const isCanvasInteractive = !isLoading && pickerSheet === null

  const statusMessage = error
    ? error
    : pendingCount > 0
      ? '保存中…'
      : isLoading
        ? '読み込み中…'
        : hint

  const draftStroke =
    draftFillColor != null
      ? {
          points: buildBoardFillPoints(),
          color: draftFillColor,
          width: BOARD_LIMITS.strokeMaxWidth,
        }
      : draftPoints.length > 0
        ? { points: draftPoints, color: penColor, width: penWidth }
        : null

  const placementLabel =
    selectedPlaceable?.kind === 'sticker'
      ? `選択中：${selectedPlaceable.collected.sticker.name}`
      : selectedPlaceable?.kind === 'photo'
        ? `選択中：${selectedPlaceable.shot.user.displayName}の写真`
        : null

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
        <button
          type="button"
          className="board-edit__undo-button"
          onClick={handleUndo}
          disabled={!canUndo || isLoading}
          aria-label="一つ戻る"
        >
          <Undo2 size={22} strokeWidth={2} />
        </button>
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
          draftStroke={draftStroke}
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
              ステッカーや写真を貼ろう
            </span>
          }
        />

        {placementLabel &&
        (activeTool === 'sticker' || activeTool === 'photo') ? (
          <p className="board-edit__placement-hint">{placementLabel}</p>
        ) : null}
      </main>

      <section className="board-edit__panel" aria-label={`${activeTool}の設定`}>
        {activeTool === 'pen' ? (
          <>
            <div className="board-edit__size-control">
              <div className="board-edit__size-header">
                <span className="board-edit__size-label">ペンの太さ</span>
                <span className="board-edit__size-value">{penSizeSlider}px</span>
              </div>
              <input
                type="range"
                className="board-edit__size-slider"
                min={PEN_SLIDER_MIN}
                max={PEN_SLIDER_MAX}
                step={1}
                value={penSizeSlider}
                onChange={handlePenSizeChange}
                disabled={isLoading}
                aria-label="ペンの太さ"
              />
            </div>

            <div className="board-edit__color-control" aria-label="ペンの色">
              <span className="board-edit__color-label">カラー</span>
              <div className="board-edit__color-palette">
                {paletteColors.slice(0, PALETTE_SLOT_COUNT).map((color, index) => (
                  <div
                    key={`palette-${index}`}
                    className="board-edit__color-swatch-slot"
                  >
                    <button
                      type="button"
                      className={`board-edit__color-swatch-button${
                        selectedPaletteIndex === index
                          ? ' board-edit__color-swatch-button--active'
                          : ''
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={
                        selectedPaletteIndex === index
                          ? `ペンの色 ${index + 1}（もう一度押すと変更）`
                          : `ペンの色 ${index + 1} を選択`
                      }
                      aria-pressed={selectedPaletteIndex === index}
                      disabled={isLoading}
                      onClick={() => handlePaletteSwatchClick(index)}
                    />
                    <input
                      ref={(element) => {
                        paletteInputRefs.current[index] = element
                      }}
                      type="color"
                      className="board-edit__color-swatch-input"
                      value={color}
                      tabIndex={-1}
                      onChange={(event) =>
                        handlePaletteColorChange(index, event)
                      }
                      aria-hidden="true"
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {activeTool === 'eraser' ? (
          <p className="board-edit__note">
            {isOwner
              ? '消したいものをタップ(オーナーはみんなの分を消せます)'
              : '消したいものをタップ(自分が描いたものだけ消せます)'}
          </p>
        ) : null}

        {activeTool === 'sticker' || activeTool === 'photo' ? (
          <p className="board-edit__note">
            {selectedPlaceable?.kind === activeTool
              ? 'ボードをタップして貼ろう。もう一度アイコンを押すと選び直せます'
              : activeTool === 'sticker'
                ? '下からステッカーを選ぼう'
                : '下からみんなの写真を選ぼう'}
          </p>
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

      <Modal
        isOpen={pickerSheet === 'sticker'}
        title="ステッカーを選択"
        onClose={() => setPickerSheet(null)}
        variant="sheet"
      >
        <div className="board-edit__picker-sheet">
          <p className="board-edit__picker-lead">
            ステッカーをタップしてください
          </p>
          {isLoadingStickers ? (
            <p className="board-edit__picker-status">読み込み中…</p>
          ) : stickersError ? (
            <p className="board-edit__picker-status board-edit__picker-status--error">
              {stickersError}
            </p>
          ) : stickers.length === 0 ? (
            <p className="board-edit__picker-status">
              まだステッカーがありません。カレンダーを開いて集めよう。
            </p>
          ) : (
            <div className="board-edit__picker-grid">
              {stickers.map((collected) => (
                <button
                  key={collected.grantId}
                  type="button"
                  className="board-edit__picker-item"
                  onClick={() => handleStickerSelect(collected)}
                >
                  {collected.sticker.imageUrl ? (
                    <img
                      src={collected.sticker.imageUrl}
                      alt={collected.sticker.name}
                    />
                  ) : (
                    <span
                      className="board-edit__picker-placeholder"
                      aria-hidden="true"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={pickerSheet === 'photo'}
        title="みんなの写真"
        onClose={() => setPickerSheet(null)}
        variant="sheet"
      >
        <div className="board-edit__picker-sheet">
          <p className="board-edit__picker-lead">
            貼りたい写真をタップしてください
          </p>
          {isLoadingPhotos ? (
            <p className="board-edit__picker-status">読み込み中…</p>
          ) : photosError ? (
            <p className="board-edit__picker-status board-edit__picker-status--error">
              {photosError}
            </p>
          ) : photos.length === 0 ? (
            <p className="board-edit__picker-status">
              まだベストショットがありません。ボード画面から写真を投稿しよう。
            </p>
          ) : (
            <div className="board-edit__picker-grid board-edit__picker-grid--photos">
              {photos.map((shot) => (
                <button
                  key={shot.id}
                  type="button"
                  className="board-edit__picker-item board-edit__picker-item--photo"
                  onClick={() => handlePhotoSelect(shot)}
                >
                  {shot.imageUrl ? (
                    <img
                      src={shot.imageUrl}
                      alt={`${shot.user.displayName}のベストショット`}
                    />
                  ) : (
                    <span
                      className="board-edit__picker-placeholder"
                      aria-hidden="true"
                    />
                  )}
                  <span className="board-edit__picker-caption">
                    {shot.user.displayName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
