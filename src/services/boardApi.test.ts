import { describe, expect, it } from 'vitest'
import {
  BOARD_LIMITS,
  buildBoardFillPoints,
  clampRange,
  clampUnit,
  isBoardFillStrokePayload,
  normalizePhotoPayload,
  normalizeRotation,
  normalizeStickerPayload,
  normalizeStrokePayload,
  type BoardPoint,
  type StrokePayload,
} from './boardApi'

describe('clampUnit', () => {
  it('0..1 の値はそのまま通す', () => {
    expect(clampUnit(0)).toBe(0)
    expect(clampUnit(0.42)).toBe(0.42)
    expect(clampUnit(1)).toBe(1)
  })

  it('範囲外は 0 / 1 に丸める', () => {
    expect(clampUnit(-0.001)).toBe(0)
    expect(clampUnit(1.5)).toBe(1)
  })

  it('NaN / Infinity は 0 として扱う', () => {
    expect(clampUnit(Number.NaN)).toBe(0)
    expect(clampUnit(Number.POSITIVE_INFINITY)).toBe(0)
  })
})

describe('clampRange', () => {
  it('min / max の境界を含めて丸める', () => {
    expect(clampRange(5, 1, 10)).toBe(5)
    expect(clampRange(1, 1, 10)).toBe(1)
    expect(clampRange(10, 1, 10)).toBe(10)
    expect(clampRange(0, 1, 10)).toBe(1)
    expect(clampRange(999, 1, 10)).toBe(10)
  })

  it('数値でない場合は min にフォールバックする', () => {
    expect(clampRange(Number.NaN, 1, 10)).toBe(1)
  })
})

describe('normalizeRotation', () => {
  it('-180..180 の値はそのまま', () => {
    expect(normalizeRotation(0)).toBe(0)
    expect(normalizeRotation(90)).toBe(90)
    expect(normalizeRotation(-90)).toBe(-90)
  })

  it('1周を超えた角度を -180..180 に折り返す', () => {
    expect(normalizeRotation(360)).toBe(0)
    expect(normalizeRotation(270)).toBe(-90)
    expect(normalizeRotation(-270)).toBe(90)
    expect(normalizeRotation(540)).toBe(-180)
  })

  it('境界の 180 / -180 は -180 に寄せる', () => {
    expect(normalizeRotation(180)).toBe(-180)
    expect(normalizeRotation(-180)).toBe(-180)
  })

  it('NaN は 0 として扱う', () => {
    expect(normalizeRotation(Number.NaN)).toBe(0)
  })
})

describe('normalizeStrokePayload', () => {
  it('座標を 0..1 に、線幅を契約の値域に丸める', () => {
    const normalized = normalizeStrokePayload({
      points: [
        { x: -1, y: 0.5 },
        { x: 2, y: 1.5 },
      ],
      color: '#ff0000',
      width: 999,
    })

    expect(normalized.points).toEqual([
      { x: 0, y: 0.5 },
      { x: 1, y: 1 },
    ])
    expect(normalized.width).toBe(BOARD_LIMITS.strokeMaxWidth)
    expect(normalized.color).toBe('#ff0000')
  })

  it('細すぎる線幅は下限まで持ち上げる', () => {
    const normalized = normalizeStrokePayload({
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      color: '#000000',
      width: 0,
    })

    expect(normalized.width).toBe(BOARD_LIMITS.strokeMinWidth)
  })

  it('上限ちょうどの点数は間引かない', () => {
    const points: BoardPoint[] = Array.from(
      { length: BOARD_LIMITS.strokeMaxPoints },
      (_, index) => ({ x: index / (BOARD_LIMITS.strokeMaxPoints - 1), y: 0 }),
    )

    const normalized = normalizeStrokePayload({
      points,
      color: '#000000',
      width: 0.01,
    })

    expect(normalized.points).toHaveLength(BOARD_LIMITS.strokeMaxPoints)
  })

  it('点が多すぎる場合は上限まで間引き、始点と終点は残す', () => {
    const total = BOARD_LIMITS.strokeMaxPoints * 3
    const points: BoardPoint[] = Array.from({ length: total }, (_, index) => ({
      x: index / (total - 1),
      y: 0,
    }))

    const normalized = normalizeStrokePayload({
      points,
      color: '#000000',
      width: 0.01,
    })

    expect(normalized.points).toHaveLength(BOARD_LIMITS.strokeMaxPoints)
    expect(normalized.points[0]).toEqual(points[0])
    expect(normalized.points[normalized.points.length - 1]).toEqual(
      points[total - 1],
    )
    // 元の並び順(x 昇順)が保たれている
    const xs = normalized.points.map((point) => point.x)
    expect(xs).toEqual([...xs].sort((a, b) => a - b))
  })
})

describe('normalizeStickerPayload / normalizePhotoPayload', () => {
  it('位置・拡大率・回転を契約の値域へ丸める', () => {
    expect(
      normalizeStickerPayload({
        stickerId: 'sticker-1',
        x: 1.4,
        y: -0.2,
        scale: 5,
        rotation: 450,
      }),
    ).toEqual({
      stickerId: 'sticker-1',
      x: 1,
      y: 0,
      scale: BOARD_LIMITS.stickerMaxScale,
      rotation: 90,
    })
  })

  it('imageUrl は指定があるときだけ含める(サーバー補完を潰さない)', () => {
    const withoutUrl = normalizeStickerPayload({
      stickerId: 'sticker-1',
      x: 0.5,
      y: 0.5,
      scale: 0.5,
      rotation: 0,
    })
    expect('imageUrl' in withoutUrl).toBe(false)

    const withUrl = normalizePhotoPayload({
      imagePath: 'best/1.jpg',
      imageUrl: 'https://example.test/1.jpg',
      x: 0.5,
      y: 0.5,
      scale: 0.001,
      rotation: 0,
    })
    expect(withUrl.imageUrl).toBe('https://example.test/1.jpg')
    expect(withUrl.scale).toBe(BOARD_LIMITS.stickerMinScale)
  })
})

describe('全面塗りストローク', () => {
  const fillPayload = (): StrokePayload => ({
    points: buildBoardFillPoints(),
    color: '#ffffff',
    width: BOARD_LIMITS.strokeMaxWidth,
  })

  it('生成した点列は 0..1 に収まり、上限点数を超えない', () => {
    const points = buildBoardFillPoints()

    expect(points.length).toBeGreaterThan(BOARD_LIMITS.strokeMinPoints)
    expect(points.length).toBeLessThanOrEqual(BOARD_LIMITS.strokeMaxPoints)
    expect(
      points.every(
        (point) =>
          point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1,
      ),
    ).toBe(true)
    // 最下端 y=1 まで塗り切っている
    expect(points[points.length - 1].y).toBe(1)
  })

  it('呼び出しごとに複製を返す(呼び出し側の変更が基準点列を壊さない)', () => {
    const first = buildBoardFillPoints()
    first[0].x = 0.5

    expect(buildBoardFillPoints()[0].x).toBe(0)
  })

  it('生成した payload は全面塗りと判定される', () => {
    expect(isBoardFillStrokePayload(fillPayload())).toBe(true)
  })

  it('線幅が上限でなければ全面塗りとみなさない', () => {
    expect(
      isBoardFillStrokePayload({ ...fillPayload(), width: 0.01 }),
    ).toBe(false)
  })

  it('点数が違えば全面塗りとみなさない(縁なぞりの誤判定防止)', () => {
    const payload = fillPayload()
    expect(
      isBoardFillStrokePayload({ ...payload, points: payload.points.slice(1) }),
    ).toBe(false)
  })

  it('許容誤差 0.001 の内側なら全面塗りと認める', () => {
    const payload = fillPayload()
    payload.points[0] = { x: 0.0005, y: 0.0005 }

    expect(isBoardFillStrokePayload(payload)).toBe(true)
  })

  it('許容誤差を超えてずれていれば全面塗りとみなさない', () => {
    const payload = fillPayload()
    payload.points[0] = { x: 0.05, y: 0 }

    expect(isBoardFillStrokePayload(payload)).toBe(false)
  })
})
