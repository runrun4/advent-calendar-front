import { apiRequest } from './apiClient'
import { resolveStickerImageUrl } from './stickerUrl'
import type { BoardOrientation } from './eventApi'

export type { BoardOrientation }

/** 今回APIが受け付ける種別。 */
export type BoardItemKind = 'STROKE' | 'STICKER' | 'PHOTO'

/** ボード上の位置。x/y ともに 0..1 の正規化座標(向き変更に耐えるため)。 */
export type BoardPoint = {
  x: number
  y: number
}

export type StrokePayload = {
  /** 2〜2000点。各成分は 0..1。 */
  points: BoardPoint[]
  /** "#rrggbb"。 */
  color: string
  /** ボード幅に対する比率(0.001..0.05)。 */
  width: number
}

export type StickerPayload = {
  stickerId: string
  /** サーバーが挿入時に補完する。リクエストでは省略可(送っても無視される)。 */
  imageUrl?: string
  /** ステッカー中心の正規化座標。 */
  x: number
  y: number
  /** ボード幅に対する比率(0.05..1)。 */
  scale: number
  /** -180..180 度。 */
  rotation: number
}

export type PhotoPayload = {
  /** このイベントのベストショットの保存パス。 */
  imagePath: string
  /** サーバーが挿入時に補完する。リクエストでは省略可。 */
  imageUrl?: string
  x: number
  y: number
  scale: number
  rotation: number
}

export type BoardItemPayload = StrokePayload | StickerPayload | PhotoPayload

export type BoardUser = {
  id: string
  displayName: string
  avatarUrl: string | null
}

type BoardItemBase = {
  id: string
  eventId: string
  createdBy: BoardUser
  /** サーバー採番(イベント内 max+1)。大きいほど手前。 */
  zIndex: number
  createdAt: string
  /**
   * 楽観的追加でローカルにだけ存在する間 true。
   * サーバーは返さないフィールドで、確定したレスポンスに差し替わると消える。
   */
  pending?: boolean
}

/**
 * kind と payload を対にした判別可能ユニオン。
 * 描画側で `item.kind === 'STROKE'` と絞り込めば payload が確定する。
 */
export type BoardItem =
  | (BoardItemBase & { kind: 'STROKE'; payload: StrokePayload })
  | (BoardItemBase & { kind: 'STICKER'; payload: StickerPayload })
  | (BoardItemBase & { kind: 'PHOTO'; payload: PhotoPayload })

export type BoardResponse = {
  eventId: string
  boardOrientation: BoardOrientation
  boardEdited: boolean
  /** zIndex 昇順。 */
  items: BoardItem[]
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
  const board = await apiRequest<BoardResponse>(`/v1/events/${eventId}/board`, {
    signal,
  })
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
  const saved = await apiRequest<BoardItem>(`/v1/events/${eventId}/board/items`, {
    method: 'POST',
    body: request,
  })
  return normalizeBoardItemImages(saved)
}

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
