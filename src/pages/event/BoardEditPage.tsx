import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  Camera,
  ChevronLeft,
  Eraser,
  Pencil,
  Sticker,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useBoardRealtime } from '../../hooks/useBoardRealtime'
import { fetchBoard, saveBoard } from '../../services/boardService'
import type { BoardOrientation } from '../../services/eventApi'
import type {
  BoardConnectionStatus,
  BoardPoint,
  BoardStrokeSegment,
} from '../../types/board'
import './BoardEditPage.css'

type BoardEditPageProps = {
  eventId: string
  boardOrientation?: BoardOrientation
  onBack: () => void
  onBoardSaved?: (boardEdited: boolean) => void
}

type Tool = 'pen' | 'eraser' | 'sticker' | 'camera'

const PEN_WIDTH = 3
const ERASER_WIDTH = 18
const REMOTE_COLORS = [
  '#e53935',
  '#1e88e5',
  '#43a047',
  '#fb8c00',
  '#8e24aa',
  '#00897b',
]

function boardCanvasClass(orientation?: BoardOrientation): string {
  return orientation === 'LANDSCAPE'
    ? 'board-edit__canvas-wrap--landscape'
    : 'board-edit__canvas-wrap--portrait'
}

function connectionStatusLabel(status: BoardConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'WS 接続'
    case 'error':
      return 'WS 未接続'
    default:
      return 'WS 接続中…'
  }
}

function colorForUser(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  }
  return REMOTE_COLORS[hash % REMOTE_COLORS.length]
}

function toNormalizedPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): BoardPoint {
  const rect = canvas.getBoundingClientRect()
  return {
    x: (clientX - rect.left) / rect.width,
    y: (clientY - rect.top) / rect.height,
  }
}

function drawSegment(
  ctx: CanvasRenderingContext2D,
  segment: BoardStrokeSegment,
  width: number,
  height: number,
) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = segment.width

  if (segment.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = 'rgba(0,0,0,1)'
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = segment.color
  }

  ctx.beginPath()
  ctx.moveTo(segment.from.x * width, segment.from.y * height)
  ctx.lineTo(segment.to.x * width, segment.to.y * height)
  ctx.stroke()
  ctx.globalCompositeOperation = 'source-over'
}

function paintImageToCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  imageData: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      resolve()
    }
    image.onerror = () => reject(new Error('failed to load board image'))
    image.src = imageData
  })
}

export function BoardEditPage({
  eventId,
  boardOrientation = 'PORTRAIT',
  onBack,
  onBoardSaved,
}: BoardEditPageProps) {
  const { user } = useAuth()
  const [activeTool, setActiveTool] = useState<Tool>('pen')
  const [isLoadingBoard, setIsLoadingBoard] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)

  const isDrawingRef = useRef(false)
  const strokeIdRef = useRef<string | null>(null)
  const lastPointRef = useRef<BoardPoint | null>(null)
  const dirtyRef = useRef(false)
  const pendingImageRef = useRef<string | null>(null)

  const handleRemoteSegment = useCallback((segment: BoardStrokeSegment) => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return

    drawSegment(ctx, segment, canvas.width, canvas.height)
    dirtyRef.current = true
  }, [])

  const { connectionStatus, error: realtimeError, broadcastSegment } =
    useBoardRealtime(eventId, { onRemoteSegment: handleRemoteSegment })

  const applyPendingImage = useCallback(async () => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    const imageData = pendingImageRef.current
    if (!canvas || !ctx || !imageData) return

    try {
      await paintImageToCanvas(canvas, ctx, imageData)
      pendingImageRef.current = null
    } catch (error) {
      console.error('failed to paint saved board', error)
      setLoadError('保存済みボードの表示に失敗しました')
    }
  }, [])

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const wrap = canvasWrapRef.current
    if (!canvas || !wrap) return

    const rect = wrap.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return

    const dpr = window.devicePixelRatio || 1
    const pixelWidth = Math.max(1, Math.floor(rect.width * dpr))
    const pixelHeight = Math.max(1, Math.floor(rect.height * dpr))

    if (canvas.width === pixelWidth && canvas.height === pixelHeight) {
      void applyPendingImage()
      return
    }

    const snapshot = canvas.toDataURL()
    canvas.width = pixelWidth
    canvas.height = pixelHeight
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctxRef.current = ctx

    if (pendingImageRef.current) {
      void applyPendingImage()
      return
    }

    const image = new Image()
    image.onload = () => {
      ctx.drawImage(image, 0, 0, pixelWidth, pixelHeight)
    }
    image.src = snapshot
  }, [applyPendingImage])

  useEffect(() => {
    resizeCanvas()

    const wrap = canvasWrapRef.current
    if (!wrap) return

    const observer = new ResizeObserver(() => {
      resizeCanvas()
    })
    observer.observe(wrap)

    return () => {
      observer.disconnect()
    }
  }, [resizeCanvas, boardOrientation])

  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      setIsLoadingBoard(true)
      setLoadError(null)
      dirtyRef.current = false
      pendingImageRef.current = null

      try {
        const board = await fetchBoard(eventId, controller.signal)
        if (controller.signal.aborted) return

        if (board.imageData) {
          pendingImageRef.current = board.imageData
          await applyPendingImage()
          // キャンバス未準備のときは resize / ResizeObserver 側で描画する。
          if (pendingImageRef.current) {
            resizeCanvas()
          }
        }
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('GET /v1/events/board failed', error)
        setLoadError('ボードの読み込みに失敗しました')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingBoard(false)
        }
      }
    }

    void load()

    return () => {
      controller.abort()
    }
  }, [eventId, applyPendingImage, resizeCanvas])

  const emitSegment = useCallback(
    (from: BoardPoint, to: BoardPoint) => {
      const canvas = canvasRef.current
      const ctx = ctxRef.current
      const userId = user?.id
      const strokeId = strokeIdRef.current
      if (!canvas || !ctx || !userId || !strokeId) return

      const segment: BoardStrokeSegment = {
        strokeId,
        userId,
        color: colorForUser(userId),
        width: activeTool === 'eraser' ? ERASER_WIDTH : PEN_WIDTH,
        tool: activeTool === 'eraser' ? 'eraser' : 'pen',
        from,
        to,
      }

      drawSegment(ctx, segment, canvas.width, canvas.height)
      dirtyRef.current = true

      if (connectionStatus === 'connected') {
        broadcastSegment(segment)
      }
    },
    [activeTool, broadcastSegment, connectionStatus, user?.id],
  )

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'pen' && activeTool !== 'eraser') return
    if (isLoadingBoard || isSaving) return

    const canvas = canvasRef.current
    if (!canvas) return

    event.currentTarget.setPointerCapture(event.pointerId)
    isDrawingRef.current = true
    strokeIdRef.current = crypto.randomUUID()
    lastPointRef.current = toNormalizedPoint(canvas, event.clientX, event.clientY)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return

    const canvas = canvasRef.current
    const lastPoint = lastPointRef.current
    if (!canvas || !lastPoint) return

    const nextPoint = toNormalizedPoint(canvas, event.clientX, event.clientY)
    emitSegment(lastPoint, nextPoint)
    lastPointRef.current = nextPoint
  }

  const finishStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    isDrawingRef.current = false
    strokeIdRef.current = null
    lastPointRef.current = null
  }

  const handleBack = async () => {
    if (isSaving) return

    setIsSaving(true)
    setSaveError(null)

    try {
      const canvas = canvasRef.current
      if (canvas && dirtyRef.current) {
        try {
          const imageData = canvas.toDataURL('image/png')
          const saved = await saveBoard(eventId, imageData)
          dirtyRef.current = false
          onBoardSaved?.(saved.boardEdited)
        } catch (error) {
          console.error('save board failed', error)
          // 保存に失敗しても、戻る操作自体は止めない
          setSaveError('ボードの保存に失敗しました')
        }
      }
    } finally {
      // 保存のあと（または変更なし）は必ず前画面へ戻る
      onBack()
    }
  }

  const tools: { id: Tool; label: string; icon: typeof Pencil }[] = [
    { id: 'pen', label: 'ペン', icon: Pencil },
    { id: 'eraser', label: '消しゴム', icon: Eraser },
    { id: 'sticker', label: 'ステッカー', icon: Sticker },
    { id: 'camera', label: 'カメラ', icon: Camera },
  ]

  const statusMessage =
    saveError ??
    loadError ??
    realtimeError ??
    (isLoadingBoard ? 'ボードを読み込み中…' : null) ??
    (isSaving ? 'ボードを保存中…' : null)

  return (
    <div className="board-edit">
      <header className="board-edit__header">
        <button
          type="button"
          className="board-edit__back-button"
          onClick={() => {
            void handleBack()
          }}
          aria-label="戻る"
          disabled={isSaving}
        >
          <ChevronLeft size={28} strokeWidth={2} />
        </button>
        <h1 className="board-edit__title">編集</h1>
        <div
          className={`board-edit__ws-status board-edit__ws-status--${connectionStatus}`}
          aria-live="polite"
          title="Supabase Realtime (WebSocket)"
        >
          <span className="board-edit__ws-dot" aria-hidden="true" />
          <span className="board-edit__ws-label">
            {connectionStatusLabel(connectionStatus)}
          </span>
        </div>
      </header>

      <main className="board-edit__main">
        <div
          ref={canvasWrapRef}
          className={`board-edit__canvas-wrap ${boardCanvasClass(boardOrientation)}`}
        >
          <canvas
            ref={canvasRef}
            className="board-edit__canvas"
            aria-label="イベントボード"
            aria-busy={isLoadingBoard || isSaving}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishStroke}
            onPointerCancel={finishStroke}
            onPointerLeave={finishStroke}
          />
        </div>
        {statusMessage ? (
          <p
            className={
              saveError || loadError || realtimeError
                ? 'board-edit__error'
                : 'board-edit__hint'
            }
            role={saveError || loadError ? 'alert' : undefined}
          >
            {statusMessage}
          </p>
        ) : connectionStatus === 'connected' ? (
          <p className="board-edit__hint">
            戻るボタンで保存して、イベントボードへ戻ります
          </p>
        ) : null}
      </main>

      <footer className="board-edit__toolbar">
        {tools.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`board-edit__tool-button${
              activeTool === id ? ' board-edit__tool-button--active' : ''
            }`}
            aria-label={label}
            aria-pressed={activeTool === id}
            disabled={isLoadingBoard || isSaving}
            onClick={() => setActiveTool(id)}
          >
            <Icon size={22} strokeWidth={2} />
          </button>
        ))}
      </footer>
    </div>
  )
}
