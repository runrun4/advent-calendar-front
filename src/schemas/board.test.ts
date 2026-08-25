import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  boardItemSchema,
  boardResponseSchema,
  stickerPayloadSchema,
  strokePayloadSchema,
} from './board'

/** GET /v1/events/{eventId}/board が返す形(boardResponse / boardItemResponse)。 */
const strokeItem = {
  id: '00000000-0000-4000-8000-0000000000a1',
  eventId: '00000000-0000-4000-8000-0000000000b2',
  clientItemId: '00000000-0000-4000-8000-0000000000c1',
  kind: 'STROKE',
  payload: {
    points: [
      { x: 0.1, y: 0.2 },
      { x: 0.3, y: 0.4 },
    ],
    color: '#ff8800',
    width: 0.01,
  },
  createdBy: {
    id: '00000000-0000-4000-8000-0000000000e1',
    displayName: 'たろう',
    avatarUrl: null,
  },
  zIndex: 1,
  version: 1,
  createdAt: '2026-08-08T09:00:00Z',
}

const stickerItem = {
  ...strokeItem,
  id: '00000000-0000-4000-8000-0000000000a2',
  kind: 'STICKER',
  payload: {
    stickerId: '00000000-0000-4000-8000-0000000000f1',
    imageUrl: 'stickers/neko.png',
    x: 0.5,
    y: 0.5,
    scale: 0.2,
    rotation: -15,
  },
  zIndex: 2,
}

describe('boardItemSchema', () => {
  it('バックエンドが返す STROKE をそのまま受け入れる', () => {
    const parsed = boardItemSchema.parse(strokeItem)

    expect(parsed.kind).toBe('STROKE')
    expect(parsed.createdBy.avatarUrl).toBeNull()
    // clientItemId / version は契約上 required だが画面が使っていないので写していない。
    expect(parsed).not.toHaveProperty('clientItemId')
    expect(parsed).not.toHaveProperty('version')
  })

  it('kind で payload の形を出し分ける', () => {
    const parsed = boardItemSchema.parse(stickerItem)

    expect(parsed.kind).toBe('STICKER')
    if (parsed.kind === 'STICKER') {
      expect(parsed.payload.imageUrl).toBe('stickers/neko.png')
    }
  })

  it('kind に対して payload が噛み合わなければ拒否する', () => {
    expect(
      boardItemSchema.safeParse({ ...strokeItem, kind: 'STICKER' }).success,
    ).toBe(false)
  })

  it('契約に無い kind は拒否する', () => {
    expect(
      boardItemSchema.safeParse({ ...strokeItem, kind: 'VIDEO' }).success,
    ).toBe(false)
  })

  it('必須フィールドが欠けていたら拒否する', () => {
    const { zIndex: _zIndex, ...rest } = strokeItem

    expect(boardItemSchema.safeParse(rest).success).toBe(false)
  })

  it('楽観的追加のローカル項目(pending)も通る', () => {
    const parsed = boardItemSchema.parse({ ...strokeItem, pending: true })

    expect(parsed.pending).toBe(true)
  })
})

describe('strokePayloadSchema', () => {
  it('点が数値でなければ拒否する', () => {
    const result = strokePayloadSchema.safeParse({
      points: [{ x: '0.1', y: 0.2 }],
      color: '#ff8800',
      width: 0.01,
    })

    expect(result.success).toBe(false)
  })
})

describe('stickerPayloadSchema', () => {
  it('imageUrl は無くても通る(リクエスト側では省略できる)', () => {
    const parsed = stickerPayloadSchema.parse({
      stickerId: 's1',
      x: 0.5,
      y: 0.5,
      scale: 0.2,
      rotation: 0,
    })

    expect(parsed.imageUrl).toBeUndefined()
  })
})

describe('boardResponseSchema', () => {
  const boardResponse = {
    eventId: '00000000-0000-4000-8000-0000000000b2',
    boardOrientation: 'PORTRAIT',
    boardEdited: true,
    items: [strokeItem, stickerItem],
  }

  it('バックエンドが返すボードをそのまま受け入れる', () => {
    const parsed = boardResponseSchema.parse(boardResponse)

    expect(parsed.items).toHaveLength(2)
    expect(parsed.boardEdited).toBe(true)
  })

  it('items が null / 未指定でも空配列にする', () => {
    expect(boardResponseSchema.parse({ ...boardResponse, items: null }).items)
      .toEqual([])
  })

  it('boardOrientation は契約の2値だけ受け入れる', () => {
    expect(
      boardResponseSchema.safeParse({
        ...boardResponse,
        boardOrientation: 'SQUARE',
      }).success,
    ).toBe(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('契約外の要素が混ざっていても、その要素だけ除外して成功する', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const parsed = boardResponseSchema.parse({
      ...boardResponse,
      items: [strokeItem, { ...stickerItem, zIndex: '2' }],
    })

    // 一覧全体を落とさない(1件の契約外要素でボードが真っ白にならない)。
    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0].id).toBe(strokeItem.id)
    expect(errorSpy).toHaveBeenCalled()
  })

  it('契約外の kind の要素も同じように読み飛ばす(将来の種別追加に耐える)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const parsed = boardResponseSchema.parse({
      ...boardResponse,
      items: [{ ...strokeItem, kind: 'VIDEO' }, stickerItem],
    })

    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0].kind).toBe('STICKER')
  })
})
