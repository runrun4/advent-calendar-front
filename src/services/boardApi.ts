import { apiRequest, apiRequestValidated } from './apiClient'
import { resolveStickerImageUrl } from './stickerUrl'
import {
  boardItemSchema,
  boardResponseSchema,
  type BoardItem,
  type BoardItemKind,
  type BoardItemPayload,
  type BoardPoint,
  type BoardResponse,
  type BoardUser,
  type PhotoPayload,
  type StickerPayload,
  type StrokePayload,
} from '../schemas/board'
import type { BoardOrientation } from './eventApi'

// 型は schemas/board.ts の Zod スキーマから導出したものを再輸出する。
// 呼び出し側は従来どおり services/boardApi から import できる。
export type {
  BoardItem,
  BoardItemKind,
  BoardItemPayload,
  BoardOrientation,
  BoardPoint,
  BoardResponse,
  BoardUser,
  PhotoPayload,
  StickerPayload,
  StrokePayload,
}

export type AddBoardItemRequest = {
  /** 冪等キー。リトライ時は同じ値を使い回す。 */
  clientItemId: string
  kind: BoardItemKind
  payload: BoardItemPayload
}

/** 契約で決まっている payload の値域。クライアント側でも丸めて422を避ける。 */
export const BOARD_LIMITS = {
  strokeMinPoints: 2,
  strokeMaxPoints: 2000,
  strokeMinWidth: 0.001,
  strokeMaxWidth: 0.05,
  stickerMinScale: 0.05,
  stickerMaxScale: 1,
} as const

/** 古い閲覧クライアントでも全面が埋まるよう、線幅の半分以下で往復する。 */
const BOARD_FILL_POINT_STEP = BOARD_LIMITS.strokeMaxWidth * 0.5

function createBoardFillPoints(): BoardPoint[] {
  const points: BoardPoint[] = []
  let leftToRight = true

  for (let y = 0; y <= 1 + BOARD_FILL_POINT_STEP / 2; y += BOARD_FILL_POINT_STEP) {
    const clampedY = Math.min(1, y)
    if (leftToRight) {
      points.push({ x: 0, y: clampedY }, { x: 1, y: clampedY })
    } else {
      points.push({ x: 1, y: clampedY }, { x: 0, y: clampedY })
    }
    leftToRight = !leftToRight
  }

  return points
}

/** 判定時に毎回再生成しない、長押し全面塗りの基準点列。 */
const BOARD_FILL_POINTS = createBoardFillPoints()

/** 長押し全面塗りを既存の STROKE 契約で表す点列。呼び出し側用に複製を返す。 */
export function buildBoardFillPoints(): BoardPoint[] {
  return BOARD_FILL_POINTS.map((point) => ({ ...point }))
}

/** 通常の縁なぞりを誤判定しないよう、幅・点数・左右交互の形まで検証する。 */
export function isBoardFillStrokePayload(payload: StrokePayload): boolean {
  if (
    payload.width !== BOARD_LIMITS.strokeMaxWidth ||
    payload.points.length !== BOARD_FILL_POINTS.length
  ) {
    return false
  }

  return payload.points.every((point, index) => {
    const expectedPoint = BOARD_FILL_POINTS[index]
    return (
      Math.abs(point.x - expectedPoint.x) <= 0.001 &&
      Math.abs(point.y - expectedPoint.y) <= 0.001
    )
  })
}

export function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function clampRange(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

/** -180..180 に正規化する。 */
export function normalizeRotation(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0
  const wrapped = ((degrees + 180) % 360 + 360) % 360 - 180
  return wrapped
}

/**
 * 送信前に STROKE payload を契約の値域へ丸める。
 * 点が多すぎる場合は等間隔に間引く(始点と終点は必ず残す)。
 */
export function normalizeStrokePayload(payload: StrokePayload): StrokePayload {
  const points = payload.points.map((point) => ({
    x: clampUnit(point.x),
    y: clampUnit(point.y),
  }))

  const thinned =
    points.length <= BOARD_LIMITS.strokeMaxPoints
      ? points
      : thinPoints(points, BOARD_LIMITS.strokeMaxPoints)

  return {
    points: thinned,
    color: payload.color,
    width: clampRange(
      payload.width,
      BOARD_LIMITS.strokeMinWidth,
      BOARD_LIMITS.strokeMaxWidth,
    ),
  }
}

function thinPoints(points: BoardPoint[], maxPoints: number): BoardPoint[] {
  const step = (points.length - 1) / (maxPoints - 1)
  const result: BoardPoint[] = []
  for (let index = 0; index < maxPoints - 1; index += 1) {
    result.push(points[Math.round(index * step)])
  }
  result.push(points[points.length - 1])
  return result
}

export function normalizeStickerPayload(payload: StickerPayload): StickerPayload {
  return {
    stickerId: payload.stickerId,
    ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
    x: clampUnit(payload.x),
    y: clampUnit(payload.y),
    scale: clampRange(
      payload.scale,
      BOARD_LIMITS.stickerMinScale,
      BOARD_LIMITS.stickerMaxScale,
    ),
    rotation: normalizeRotation(payload.rotation),
  }
}

export function normalizePhotoPayload(payload: PhotoPayload): PhotoPayload {
  return {
    imagePath: payload.imagePath,
    ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
    x: clampUnit(payload.x),
    y: clampUnit(payload.y),
    scale: clampRange(
      payload.scale,
      BOARD_LIMITS.stickerMinScale,
      BOARD_LIMITS.stickerMaxScale,
    ),
    rotation: normalizeRotation(payload.rotation),
  }
}

export async function getBoard(
  eventId: string,
  signal?: AbortSignal,
): Promise<BoardResponse> {
  const board = await apiRequestValidated(
    `/v1/events/${eventId}/board`,
    boardResponseSchema,
    { signal },
  )
  return {
    ...board,
    items: board.items.map(normalizeBoardItemImages),
  }
}

/** 201=新規 / 200=同一 clientItemId の再送。どちらも BoardItem が返る。 */
export async function addBoardItem(
  eventId: string,
  request: AddBoardItemRequest,
): Promise<BoardItem> {
  const saved = await apiRequestValidated(
    `/v1/events/${eventId}/board/items`,
    boardItemSchema,
    {
      method: 'POST',
      body: request,
    },
  )
  return normalizeBoardItemImages(saved)
}

/** 204 を返すだけで本文が無いので、検証する対象がない。 */
export async function deleteBoardItem(
  eventId: string,
  itemId: string,
): Promise<void> {
  await apiRequest<void>(`/v1/events/${eventId}/board/items/${itemId}`, {
    method: 'DELETE',
  })
}

function normalizeBoardItemImages(item: BoardItem): BoardItem {
  if (item.kind === 'STICKER' && item.payload.imageUrl) {
    return {
      ...item,
      payload: {
        ...item.payload,
        imageUrl: resolveStickerImageUrl(item.payload.imageUrl),
      },
    }
  }
  return item
}

export { normalizeBoardItemImages }
