import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import type {
  BoardItem,
  BoardOrientation,
  BoardPoint,
  PhotoPayload,
  StickerPayload,
  StrokePayload,
} from '../../services/boardApi'
import { isBoardFillStrokePayload } from '../../services/boardApi'
import {
  boardAspectClass,
  boardViewBox,
  clientPointToBoardPoint,
  toPolylinePoints,
  type BoardViewBox,
} from './boardGeometry'
import './BoardCanvas.css'

/** 細い線でもタップで拾えるようにする当たり判定の最小幅(viewBox 単位)。 */
const STROKE_HIT_WIDTH = 18

export type BoardDraftStroke = StrokePayload

export type BoardDraftSticker = {
  imageUrl: string
  x: number
  y: number
  scale: number
  rotation: number
}

type BoardCanvasProps = {
  orientation: BoardOrientation
  /** zIndex 昇順で渡す(useBoard が整列済みの配列を返す)。 */
  items: BoardItem[]
  className?: string
  /** 描いている最中のストローク。まだサーバーへ送っていないもの。 */
  draftStroke?: BoardDraftStroke | null
  /** 置く位置を調整している最中のステッカー。 */
  draftSticker?: BoardDraftSticker | null
  /** true を返したアイテムだけタップで拾える(消しゴム用)。 */
  isItemPickable?: (item: BoardItem) => boolean
  onPickItem?: (item: BoardItem) => void
  /** 拾えないアイテムを半透明にして無効であることを示す。 */
  dimUnpickableItems?: boolean
  onBoardPointerDown?: (
    point: BoardPoint,
    event: ReactPointerEvent<SVGSVGElement>,
  ) => void
  onBoardPointerMove?: (
    point: BoardPoint,
    event: ReactPointerEvent<SVGSVGElement>,
  ) => void
  onBoardPointerUp?: (
    point: BoardPoint,
    event: ReactPointerEvent<SVGSVGElement>,
  ) => void
  /** ポインタ操作を受け付けるか。閲覧ビューでは false。 */
  interactive?: boolean
  /** アイテムが1つも無いときに重ねて出す案内。 */
  emptyContent?: ReactNode
  ariaLabel?: string
}

function strokeElements(
  item: Extract<BoardItem, { kind: 'STROKE' }>,
  viewBox: BoardViewBox,
  pickable: boolean,
  onPick: (() => void) | undefined,
) {
  if (isBoardFillStrokePayload(item.payload)) {
    return (
      <>
        <rect
          x={0}
          y={0}
          width={viewBox.width}
          height={viewBox.height}
          fill={item.payload.color}
        />
        {pickable && onPick ? (
          <rect
            className="board-canvas__hit"
            x={0}
            y={0}
            width={viewBox.width}
            height={viewBox.height}
            fill="transparent"
            onPointerDown={(event) => {
              event.stopPropagation()
              onPick()
            }}
          />
        ) : null}
      </>
    )
  }

  const points = toPolylinePoints(item.payload.points, viewBox)
  const width = item.payload.width * viewBox.width

  return (
    <>
      <polyline
        points={points}
        fill="none"
        stroke={item.payload.color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pickable && onPick ? (
        <polyline
          className="board-canvas__hit"
          points={points}
          fill="none"
          stroke="transparent"
          strokeWidth={Math.max(width, STROKE_HIT_WIDTH)}
          strokeLinecap="round"
          strokeLinejoin="round"
          onPointerDown={(event) => {
            event.stopPropagation()
            onPick()
          }}
        />
      ) : null}
    </>
  )
}

function stickerTransform(
  payload: Pick<StickerPayload | PhotoPayload, 'x' | 'y' | 'rotation'>,
  viewBox: BoardViewBox,
): string {
  const centerX = payload.x * viewBox.width
  const centerY = payload.y * viewBox.height
  return `translate(${centerX} ${centerY}) rotate(${payload.rotation})`
}

function imageItemElements(
  payload: Pick<
    StickerPayload | PhotoPayload,
    'imageUrl' | 'x' | 'y' | 'scale' | 'rotation'
  >,
  viewBox: BoardViewBox,
  pickable: boolean,
  onPick: (() => void) | undefined,
) {
  // scale はボード幅に対する比率。画像の縦横比は preserveAspectRatio で保つ。
  const size = payload.scale * viewBox.width
  const offset = -size / 2

  return (
    <g transform={stickerTransform(payload, viewBox)}>
      {payload.imageUrl ? (
        <image
          href={payload.imageUrl}
          x={offset}
          y={offset}
          width={size}
          height={size}
          preserveAspectRatio="xMidYMid meet"
        />
      ) : (
        <rect
          x={offset}
          y={offset}
          width={size}
          height={size}
          rx={size * 0.12}
          fill="#e6e6e6"
        />
      )}
      {pickable && onPick ? (
        <rect
          className="board-canvas__hit"
          x={offset}
          y={offset}
          width={size}
          height={size}
          fill="transparent"
          onPointerDown={(event) => {
            event.stopPropagation()
            onPick()
          }}
        />
      ) : null}
    </g>
  )
}

/**
 * 閲覧・編集で共用するボードの描画面。
 *
 * アイテムの座標はすべて 0..1 の正規化座標で、ここで viewBox 単位へ引き伸ばす。
 * 向きが変わっても同じデータをそのまま描けるようにするための構造。
 */
export function BoardCanvas({
  orientation,
  items,
  className,
  draftStroke = null,
  draftSticker = null,
  isItemPickable,
  onPickItem,
  dimUnpickableItems = false,
  onBoardPointerDown,
  onBoardPointerMove,
  onBoardPointerUp,
  interactive = false,
  emptyContent,
  ariaLabel = 'イベントボード',
}: BoardCanvasProps) {
  const viewBox = boardViewBox(orientation)

  const handlePointer =
    (
      handler:
        | ((point: BoardPoint, event: ReactPointerEvent<SVGSVGElement>) => void)
        | undefined,
    ) =>
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (!handler) return
      const point = clientPointToBoardPoint(
        event.currentTarget,
        event.clientX,
        event.clientY,
        viewBox,
      )
      if (!point) return
      handler(point, event)
    }

  const isEmpty = items.length === 0 && !draftStroke && !draftSticker

  return (
    <div
      className={`board-canvas ${boardAspectClass(orientation)}${
        className ? ` ${className}` : ''
      }`}
    >
      <svg
        className={`board-canvas__svg${
          interactive ? ' board-canvas__svg--interactive' : ''
        }${dimUnpickableItems ? ' board-canvas__svg--pick-mode' : ''
        }`}
        viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={ariaLabel}
        onPointerDown={interactive ? handlePointer(onBoardPointerDown) : undefined}
        onPointerMove={interactive ? handlePointer(onBoardPointerMove) : undefined}
        onPointerUp={interactive ? handlePointer(onBoardPointerUp) : undefined}
        onPointerCancel={interactive ? handlePointer(onBoardPointerUp) : undefined}
        onContextMenu={
          interactive
            ? (event) => {
                event.preventDefault()
              }
            : undefined
        }
      >
        {items.map((item) => {
          const pickable = isItemPickable ? isItemPickable(item) : false
          const onPick = onPickItem ? () => onPickItem(item) : undefined
          const dimmed = dimUnpickableItems && !pickable
          const isFill =
            item.kind === 'STROKE' && isBoardFillStrokePayload(item.payload)

          return (
            <g
              key={item.id}
              className={`board-canvas__item${
                item.pending ? ' board-canvas__item--pending' : ''
              }${dimmed ? ' board-canvas__item--dimmed' : ''}${
                isFill ? ' board-canvas__item--fill' : ''
              }`}
            >
              {item.kind === 'STROKE'
                ? strokeElements(item, viewBox, pickable, onPick)
                : imageItemElements(item.payload, viewBox, pickable, onPick)}
            </g>
          )
        })}

        {draftStroke && draftStroke.points.length > 0 ? (
          isBoardFillStrokePayload(draftStroke) ? (
            <rect
              x={0}
              y={0}
              width={viewBox.width}
              height={viewBox.height}
              fill={draftStroke.color}
            />
          ) : (
            <polyline
              points={toPolylinePoints(draftStroke.points, viewBox)}
              fill="none"
              stroke={draftStroke.color}
              strokeWidth={draftStroke.width * viewBox.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        ) : null}

        {draftSticker ? (
          <g
            className="board-canvas__draft-sticker"
            transform={stickerTransform(draftSticker, viewBox)}
          >
            <image
              href={draftSticker.imageUrl}
              x={(-draftSticker.scale * viewBox.width) / 2}
              y={(-draftSticker.scale * viewBox.width) / 2}
              width={draftSticker.scale * viewBox.width}
              height={draftSticker.scale * viewBox.width}
              preserveAspectRatio="xMidYMid meet"
            />
          </g>
        ) : null}
      </svg>

      {isEmpty && emptyContent ? (
        <div className="board-canvas__empty">{emptyContent}</div>
      ) : null}
    </div>
  )
}
