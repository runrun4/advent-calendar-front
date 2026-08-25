import { z } from 'zod'
import { userSchema } from './common'
import { boardOrientationSchema } from './event'

/**
 * ボード系エンドポイントのレスポンススキーマ。
 *
 * 正本は runrun-backend の `docs/api/openapi.yaml`（BoardResponse / BoardItem）。
 * schemas/event.ts と同じく「画面が実際に読むフィールド」だけを写している
 * （契約の clientItemId / version は今の画面が読まないので写していない）。
 *
 * ただし version は「使っていないから省いた」だけで、要らないわけではない。
 * PATCH（ステッカー移動など）を実装するときは version を必ずここへ写し戻すこと。
 * 楽観ロックのキーであり、409（BOARD_ITEM_VERSION_CONFLICT）で再試行するには
 * サーバーが返した version を握っている必要がある
 * （runrun-backend の internal/httpapi/board.go 参照）。
 *
 * payload の値域（点数・色・スケールなど）はサーバーが書き込み時に検証済みなので、
 * ここでは形だけを見る。送信前の丸めは services/boardApi.ts の normalize* が担当する。
 */

/** ボード左上を原点とする正規化座標。 */
export const boardPointSchema = z.object({
  x: z.number(),
  y: z.number(),
})
export type BoardPoint = z.infer<typeof boardPointSchema>

export const strokePayloadSchema = z.object({
  /** 2〜2000点。各成分は 0..1。 */
  points: z.array(boardPointSchema),
  /** "#rrggbb"。 */
  color: z.string(),
  /** ボード幅に対する比率(0.001..0.05)。 */
  width: z.number(),
})
export type StrokePayload = z.infer<typeof strokePayloadSchema>

export const stickerPayloadSchema = z.object({
  stickerId: z.string(),
  /** サーバーが挿入時に補完する。リクエストでは省略可(送っても無視される)。 */
  imageUrl: z.string().optional(),
  /** ステッカー中心の正規化座標。 */
  x: z.number(),
  y: z.number(),
  /** ボード幅に対する比率(0.05..1)。 */
  scale: z.number(),
  /** -180..180 度。 */
  rotation: z.number(),
})
export type StickerPayload = z.infer<typeof stickerPayloadSchema>

export const photoPayloadSchema = z.object({
  /** このイベントのベストショットの保存パス。 */
  imagePath: z.string(),
  /** サーバーが挿入時に補完する。リクエストでは省略可。 */
  imageUrl: z.string().optional(),
  x: z.number(),
  y: z.number(),
  scale: z.number(),
  rotation: z.number(),
})
export type PhotoPayload = z.infer<typeof photoPayloadSchema>

export type BoardItemPayload = StrokePayload | StickerPayload | PhotoPayload

export type BoardUser = z.infer<typeof userSchema>

const boardItemBaseSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  createdBy: userSchema,
  /** サーバー採番(イベント内 max+1)。大きいほど手前。 */
  zIndex: z.number(),
  createdAt: z.string(),
  /**
   * 楽観的追加でローカルにだけ存在する間 true。
   * サーバーは返さないフィールドだが、useBoard がこの型のまま持ち回るので
   * 導出型に残すために optional で置いている。
   */
  pending: z.boolean().optional(),
})

/**
 * kind と payload を対にした判別可能ユニオン。
 * 描画側で `item.kind === 'STROKE'` と絞り込めば payload が確定する。
 *
 * PHOTO は DB の check 制約にはあるが今の API は受け付けない(将来拡張用)。
 * ローカルの楽観的追加で同じ型を使うので、ここにも残してある。
 */
export const boardItemSchema = z.discriminatedUnion('kind', [
  boardItemBaseSchema.extend({
    kind: z.literal('STROKE'),
    payload: strokePayloadSchema,
  }),
  boardItemBaseSchema.extend({
    kind: z.literal('STICKER'),
    payload: stickerPayloadSchema,
  }),
  boardItemBaseSchema.extend({
    kind: z.literal('PHOTO'),
    payload: photoPayloadSchema,
  }),
])
export type BoardItem = z.infer<typeof boardItemSchema>

/** 今回APIが受け付ける種別。 */
export type BoardItemKind = BoardItem['kind']

/**
 * 一覧は「要素単位で許容」する。
 *
 * 配列ごと boardItemSchema で検証すると、契約外の要素が1つ混ざっただけで
 * 一覧全体が ApiError になり、ボードが真っ白になってしまう。将来サーバーが
 * kind を増やしても、読めなかったその要素だけ落として画面全体は生かす。
 *
 * Realtime 側（hooks/useBoard.ts の itemFromRealtimeRow）も未知の kind の行を
 * null で捨てて描画を続けているので、REST 側もそれに揃えた方針。
 *
 * null / 未指定を空配列として受ける点は common.ts の nullableArray と同じ。
 */
const boardItemsSchema = z
  .array(z.unknown())
  .nullable()
  .default([])
  .transform((items) =>
    (items ?? []).flatMap((item) => {
      const parsed = boardItemSchema.safeParse(item)
      if (!parsed.success) {
        console.error('契約に合わないボード要素を無視します', parsed.error.issues)
        return []
      }
      return [parsed.data]
    }),
  )

export const boardResponseSchema = z.object({
  eventId: z.string(),
  boardOrientation: boardOrientationSchema,
  boardEdited: z.boolean(),
  /** zIndex 昇順。 */
  items: boardItemsSchema,
})
export type BoardResponse = z.infer<typeof boardResponseSchema>
