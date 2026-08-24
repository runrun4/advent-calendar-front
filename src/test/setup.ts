// 全テストの前に読み込まれる共通セットアップ (vite.config.ts の test.setupFiles)。
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// テスト間で描画済みの DOM が残らないようにする。
afterEach(() => {
  cleanup()
})

type Matrix2D = {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

/**
 * jsdom は Geometry Interfaces (DOMPoint / DOMMatrix) を実装していないため、
 * SVG 座標変換を使うコード(boardGeometry など)がテストできない。
 * 2D アフィン変換だけの最小実装を補う。
 */
class DOMPointPolyfill {
  x: number
  y: number

  constructor(x = 0, y = 0) {
    this.x = x
    this.y = y
  }

  matrixTransform(matrix: Matrix2D): DOMPointPolyfill {
    return new DOMPointPolyfill(
      matrix.a * this.x + matrix.c * this.y + matrix.e,
      matrix.b * this.x + matrix.d * this.y + matrix.f,
    )
  }
}

if (!('DOMPoint' in globalThis)) {
  Object.defineProperty(globalThis, 'DOMPoint', {
    value: DOMPointPolyfill,
    writable: true,
    configurable: true,
  })
}
