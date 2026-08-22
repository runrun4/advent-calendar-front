// ==========================================
// 数値ユーティリティ (イージング・補間・擬似乱数)
// design/ConstellationCalendar.dc.html の cl/c01/lerp/eo3/eio3/seeded が正
// ==========================================

/** value を [min, max] にクランプする */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

/** value を [0, 1] にクランプする */
export const clamp01 = (value: number): number => clamp(value, 0, 1)

/** 線形補間 */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/** easeOutCubic */
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)

/** easeInOutCubic */
export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/**
 * シード固定の擬似乱数 (0..1)。再レンダリングしても同じ値を返すため、
 * 背景の星のまたたき周期・遅延をちらつかせずに固定できる。
 */
export const seeded = (i: number, m: number): number => (Math.sin(i * 127.1 + m * 311.7) + 1) / 2
