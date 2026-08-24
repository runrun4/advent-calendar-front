import { describe, expect, it } from 'vitest'
import {
  boardAspectClass,
  boardViewBox,
  clientPointToBoardPoint,
  toPolylinePoints,
  type BoardViewBox,
} from './boardGeometry'

/**
 * clientPointToBoardPoint は SVGSVGElement.getScreenCTM() しか使わないので、
 * jsdom で作れない SVG 要素の代わりに、その1メソッドだけを持つ偽物を渡す。
 * inverse() が返すのは「画面座標 → viewBox 座標」の 2D アフィン行列。
 */
function fakeSvg(inverse: {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
} | null): SVGSVGElement {
  return {
    getScreenCTM: () => (inverse === null ? null : { inverse: () => inverse }),
  } as unknown as SVGSVGElement
}

/** 画面が viewBox の2倍に拡大され、(10, 20) だけずれて表示されている状態の逆行列。 */
const HALF_SCALE_INVERSE = { a: 0.5, b: 0, c: 0, d: 0.5, e: -5, f: -10 }

describe('boardViewBox', () => {
  it('LANDSCAPE は 4:3 の viewBox を返す', () => {
    expect(boardViewBox('LANDSCAPE')).toEqual({ width: 400, height: 300 })
  })

  it('PORTRAIT は 3:4 の viewBox を返す', () => {
    expect(boardViewBox('PORTRAIT')).toEqual({ width: 300, height: 400 })
  })
})

describe('boardAspectClass', () => {
  it('向きごとに CSS クラスを出し分ける', () => {
    expect(boardAspectClass('LANDSCAPE')).toBe('board-canvas--landscape')
    expect(boardAspectClass('PORTRAIT')).toBe('board-canvas--portrait')
  })
})

describe('clientPointToBoardPoint', () => {
  const viewBox: BoardViewBox = { width: 300, height: 400 }

  it('CTM が取得できない(未描画など)場合は null を返す', () => {
    expect(clientPointToBoardPoint(fakeSvg(null), 100, 100, viewBox)).toBeNull()
  })

  it('画面座標を 0..1 の正規化座標へ変換する', () => {
    // 画面 (310, 420) → viewBox (150, 200) → 中央
    expect(
      clientPointToBoardPoint(fakeSvg(HALF_SCALE_INVERSE), 310, 420, viewBox),
    ).toEqual({ x: 0.5, y: 0.5 })
  })

  it('左上・右下の端はちょうど 0 と 1 になる', () => {
    expect(
      clientPointToBoardPoint(fakeSvg(HALF_SCALE_INVERSE), 10, 20, viewBox),
    ).toEqual({ x: 0, y: 0 })
    expect(
      clientPointToBoardPoint(fakeSvg(HALF_SCALE_INVERSE), 610, 820, viewBox),
    ).toEqual({ x: 1, y: 1 })
  })

  it('viewBox の外(レターボックス部分)へはみ出しても 0..1 に丸める', () => {
    expect(
      clientPointToBoardPoint(fakeSvg(HALF_SCALE_INVERSE), -500, 5000, viewBox),
    ).toEqual({ x: 0, y: 1 })
  })
})

describe('toPolylinePoints', () => {
  const viewBox: BoardViewBox = { width: 300, height: 400 }

  it('正規化座標を viewBox 単位の points 属性へ変換する', () => {
    expect(
      toPolylinePoints(
        [
          { x: 0, y: 0 },
          { x: 0.5, y: 0.5 },
          { x: 1, y: 1 },
        ],
        viewBox,
      ),
    ).toBe('0,0 150,200 300,400')
  })

  it('小数第2位までに丸める', () => {
    // 0.123456 * 300 = 37.0368 → 37.04
    expect(toPolylinePoints([{ x: 0.123456, y: 0.123456 }], viewBox)).toBe(
      '37.04,49.38',
    )
  })

  it('空配列は空文字になる', () => {
    expect(toPolylinePoints([], viewBox)).toBe('')
  })
})
