// ==========================================
// イベントごとに固有の星座を生成する
// イベント ID をシードにした決定的な乱数でランダムウォークし、任意の日数 N に対して
// 「毎回同じ形」「イベントが違えば別の形」になる星の並びを作る。
// 破綻しないこと (画面内に収まる・星同士が近すぎない・線が順にたどれる) を優先し、
// 星座らしさの追求はしない。
// ==========================================
import { MAX_DAYS, layoutFromStars } from './constellationLayout'
import type { ConstellationLayout } from './constellationLayout'

/*
 * ==========================================
 * 決定的な擬似乱数 (FNV-1a ハッシュ + mulberry32)
 * ========================================== */

const FNV_OFFSET_BASIS = 2166136261
const FNV_PRIME = 16777619

/** 文字列を 32bit ハッシュへ (FNV-1a) */
const hashSeed = (seed: string): number => {
  let h = FNV_OFFSET_BASIS >>> 0
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, FNV_PRIME) >>> 0
  }
  return h >>> 0
}

/** mulberry32: 32bit シードから 0..1 の乱数列を決定的に生成する */
const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/*
 * ==========================================
 * ランダムウォークの制約
 * 星座座標系は手作り30点と同じ 390×520 相当。四辺に 40px の余白を取る。
 * ========================================== */

const LAYOUT_W = 390
const LAYOUT_H = 520
const MARGIN = 40

const X_MIN = MARGIN
const X_MAX = LAYOUT_W - MARGIN
const Y_MIN = MARGIN
const Y_MAX = LAYOUT_H - MARGIN
const CENTER_X = (X_MIN + X_MAX) / 2
const CENTER_Y = (Y_MIN + Y_MAX) / 2

/** 1ステップの距離 */
const STEP_MIN = 36
const STEP_MAX = 56
/** 候補が尽きたときに緩めるステップの上限 (混み合った場所から抜け出せるように) */
const STEP_MAX_RELAXED = 72
/** 線が順にたどれるよう、向きの変化はこの範囲に制限する */
const TURN_MAX = (75 * Math.PI) / 180
/** 候補が尽きたときに緩める向きの範囲 */
const TURN_MAX_RELAXED = (120 * Math.PI) / 180
/** 境界補正まで含めた、直前の向きからの折れ角の上限 (線が折り返して見えないように) */
const TURN_HARD_MAX = (110 * Math.PI) / 180
/** 既存の全星との最小距離 */
const MIN_DIST = 30
const MIN_DIST_RELAXED = 22
/** 1ステップあたりの試行回数 */
const MAX_ATTEMPTS = 40
/** 境界からこの距離まで近づいたら向きを中心方向へ補正する */
const EDGE_MARGIN = 80

const TAU = Math.PI * 2

/** 角度差を (-π, π] へ正規化する */
const normalizeAngle = (a: number): number => {
  const r = ((a + Math.PI) % TAU + TAU) % TAU - Math.PI
  return r
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

/** 座標系の外へ出ていないか */
const isInside = (x: number, y: number): boolean =>
  x >= X_MIN && x <= X_MAX && y >= Y_MIN && y <= Y_MAX

/** 既存の全星との最小距離 */
const minDistanceTo = (
  points: readonly (readonly [number, number])[],
  x: number,
  y: number
): number => {
  let min = Infinity
  for (const [px, py] of points) {
    const d = Math.hypot(x - px, y - py)
    if (d < min) min = d
  }
  return min
}

const round1 = (v: number): number => Math.round(v * 10) / 10

/*
 * ==========================================
 * 生成本体
 * ========================================== */

type CreateLayoutParams = {
  /** 同じ値なら常に同じ形になる (本体ではイベント ID) */
  seed: string
  /** 星の数 = イベントの日数。1〜MAX_DAYS にクランプする */
  dayCount: number
}

export const createConstellationLayout = ({
  seed,
  dayCount,
}: CreateLayoutParams): ConstellationLayout => {
  // NaN が来ると Math.max が NaN を返してループが回らず1点に縮退するため、数値でなければ 1 日扱い
  const safeCount = Number.isFinite(dayCount) ? Math.round(dayCount) : 1
  const n = Math.min(MAX_DAYS, Math.max(1, safeCount))
  const rand = mulberry32(hashSeed(seed))

  // 1日目は下寄りから始め、上へ向かって伸びていく (手作り30点と同じ流れ)
  const start: [number, number] = [
    round1(X_MIN + 40 + rand() * (X_MAX - X_MIN - 80)),
    round1(Y_MAX - rand() * 90),
  ]
  const points: [number, number][] = [start]
  let heading = -Math.PI / 2 + (rand() * 2 - 1) * ((50 * Math.PI) / 180)

  for (let i = 1; i < n; i += 1) {
    const [fx, fy] = points[points.length - 1]

    // 境界に近いほど、中心方向へ基準の向きを寄せる
    const edgeDist = Math.min(fx - X_MIN, X_MAX - fx, fy - Y_MIN, Y_MAX - fy)
    const pull = clamp01((EDGE_MARGIN - edgeDist) / EDGE_MARGIN)
    const toCenter = Math.atan2(CENTER_Y - fy, CENTER_X - fx)
    const base = heading + normalizeAngle(toCenter - heading) * pull * 0.8

    let bestX = 0
    let bestY = 0
    let bestAngle = base
    let bestDist = -1
    let accepted = false

    for (let pass = 0; pass < 2 && !accepted; pass += 1) {
      // 40回すべて試して「既存の星から最も離れる候補」を採る。先着順より星が散る
      const turn = pass === 0 ? TURN_MAX : TURN_MAX_RELAXED
      const stepMax = pass === 0 ? STEP_MAX : STEP_MAX_RELAXED
      const needed = pass === 0 ? MIN_DIST : MIN_DIST_RELAXED

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const raw = base + (rand() * 2 - 1) * turn * (1 - 0.4 * pull)
        const angle =
          heading +
          Math.max(-TURN_HARD_MAX, Math.min(TURN_HARD_MAX, normalizeAngle(raw - heading)))
        const len = STEP_MIN + rand() * (stepMax - STEP_MIN)
        const x = round1(fx + Math.cos(angle) * len)
        const y = round1(fy + Math.sin(angle) * len)
        if (!isInside(x, y)) continue

        const dist = minDistanceTo(points, x, y)
        if (dist > bestDist) {
          bestDist = dist
          bestX = x
          bestY = y
          bestAngle = angle
        }
        if (dist >= needed) accepted = true
      }
    }

    if (bestDist < 0) {
      // 全候補が枠外という極端なケース: 中心方向へ最小ステップだけ進める
      bestAngle = toCenter
      bestX = Math.min(X_MAX, Math.max(X_MIN, round1(fx + Math.cos(toCenter) * STEP_MIN)))
      bestY = Math.min(Y_MAX, Math.max(Y_MIN, round1(fy + Math.sin(toCenter) * STEP_MIN)))
    }

    points.push([bestX, bestY])
    heading = bestAngle
  }

  return layoutFromStars(points)
}
