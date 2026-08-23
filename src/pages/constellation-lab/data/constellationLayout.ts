// ==========================================
// 星座の座標データ・カメラ/演出まわりの数値定数
// design/ConstellationCalendar.dc.html が正。値は変更しない。
// ==========================================
import { seeded } from '../utils/easing'
import type { DayState } from '../types/constellation'

/** SVG viewBox のサイズ (dc.html 準拠。縦を640へ広げ、下部にHUD/CTAの余白を確保) */
export const VIEW_W = 390
export const VIEW_H = 640
export const SCREEN_CX = VIEW_W / 2
export const SCREEN_CY = VIEW_H / 2

/** 旧 viewBox の高さ。BG_STARS の y はこの座標系で定義されているためスケール変換に使う */
const BG_LAYOUT_H = 520

/** 30日分の星座標。day1が左下、day30が左上のゴール星 */
export const STARS: readonly (readonly [number, number])[] = [
  [48, 480], [92, 452], [70, 408], [120, 396], [158, 424],
  [196, 400], [176, 356], [222, 340], [264, 362], [300, 330],
  [276, 292], [312, 262], [282, 226], [236, 244], [200, 216],
  [222, 176], [180, 152], [140, 176], [108, 148], [128, 108],
  [172, 96], [214, 108], [252, 88], [290, 104], [322, 76],
  [300, 40], [256, 32], [216, 44], [170, 32], [120, 40],
]

/** 扱える最大日数 (=手作り星座の点数)。イベントの日数はこれを上限にクランプする */
export const MAX_DAYS = STARS.length

/** @deprecated MAX_DAYS の別名 (意味は「最大日数」)。実際の日数は ConstellationLayout.dayCount */
export const TOTAL_DAYS = MAX_DAYS

/** 開封済み日数から、指定日の開閉状態を求める */
export const dayStateOf = (day: number, opened: number): DayState =>
  day <= opened ? 'opened' : day === opened + 1 ? 'openable' : 'locked'

/** 背景の小さな星 (x, y, r, opacity)。y は BG_LAYOUT_H(520) 座標系 */
export const BG_STARS: readonly (readonly [number, number, number, number])[] = [
  [22, 30, 1.2, 0.5], [60, 96, 0.9, 0.3], [140, 24, 1.0, 0.4],
  [250, 140, 0.9, 0.35], [348, 30, 1.3, 0.5], [368, 120, 0.9, 0.3],
  [30, 180, 1.0, 0.35], [340, 200, 1.1, 0.4], [20, 300, 0.9, 0.3],
  [356, 300, 1.0, 0.35], [40, 372, 1.2, 0.4], [366, 396, 0.9, 0.3],
  [16, 440, 0.9, 0.35], [120, 500, 1.0, 0.3], [230, 496, 0.9, 0.35],
  [330, 470, 1.2, 0.45], [96, 250, 0.8, 0.25], [286, 380, 0.8, 0.3],
  [190, 290, 0.8, 0.22], [64, 60, 0.8, 0.28], [310, 160, 0.8, 0.3],
  [150, 64, 0.8, 0.26], [240, 40, 0.9, 0.3], [352, 340, 0.8, 0.28],
]

/** BG_STARS の y を現在の VIEW_H に合わせてスケールする */
export const scaleBgY = (y: number): number => (y * VIEW_H) / BG_LAYOUT_H

/*
 * ==========================================
 * 背景の3層パララックス
 * カメラ移動量の 2% / 5% / 9% だけ逆方向へずらして奥行きを出す。
 * 乱数はシード関数で固定し、再レンダリングでちらつかない。
 * ========================================== */

export type BgStarVisual = { x: number; y: number; r: number; o: number; dur: number; delay: number }

const buildBgLayer = (source: readonly (readonly [number, number, number, number])[], mul: number, fillMul: number): BgStarVisual[] =>
  source.map(([x, y, r, o], i) => ({
    x,
    y: scaleBgY(y),
    r: r * mul,
    o: o * fillMul,
    dur: 2.4 + seeded(i, 3) * 4.2,
    delay: seeded(i, 7) * 5,
  }))

export const BG_LAYER_A: readonly BgStarVisual[] = buildBgLayer(BG_STARS.slice(0, 9), 1.3, 1)
export const BG_LAYER_B: readonly BgStarVisual[] = buildBgLayer(BG_STARS.slice(9, 17), 1.05, 0.8)
export const BG_LAYER_C: readonly BgStarVisual[] = buildBgLayer(BG_STARS.slice(17), 0.85, 0.7)

/** 4方向に尖る星型パス (s=大きさ) */
export const sparklePath = (s: number): string => {
  const c = (s / 5).toFixed(2)
  return `M 0 ${-s} C ${c} ${-c} ${c} ${-c} ${s} 0 C ${c} ${c} ${c} ${c} 0 ${s} C ${-c} ${c} ${-c} ${c} ${-s} 0 C ${-c} ${-c} ${-c} ${-c} 0 ${-s} Z`
}

/*
 * ==========================================
 * カメラ・スワイプ関連の定数
 * ========================================== */

/** 日常ビューのズーム係数 */
export const K_IDLE = 3.8
/** スワイプ移動中にドリーインするズーム係数 (旧 7.5 は寄りすぎたため緩めた) */
export const K_DOLLY = 6.4
/** フィナーレで全体が画面に収まるズーム係数 (手作り30点の正。DEFAULT_LAYOUT.finaleK と同値) */
export const FINALE_K = 1.15
/** この距離ドラッグすると隣の星まで進行度100% */
export const DRAG_PX = 130
/** 指を離した後のスナップアニメーション時間 */
export const SNAP_MS = 280
/** カード閉じ後、自動で次の星へ寄っていくカメラワークの時間 */
export const GLIDE_MS = 760

/**
 * from(レイアウト座標) から to への画面上の単位ベクトル。
 * y は下向き。星座の経路は上下左右へ折れるため、スワイプの向きを
 * この単位ベクトルへ射影して進行度を求める (IMPLEMENTATION_NOTES §1-1)。
 */
export const dirTo = (
  from: readonly [number, number],
  to: readonly [number, number]
): [number, number] => {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const len = Math.hypot(dx, dy) || 1
  return [dx / len, dy / len]
}

/*
 * ==========================================
 * 星座レイアウト
 * 星の座標と、そこから決まる派生値 (重心・フィナーレのズーム係数・累積長) を
 * 1つのオブジェクトにまとめる。手作りの30点と、イベントごとの生成結果
 * (constellationGenerator) を同じ型で扱えるようにするため。
 * ========================================== */

export type ConstellationLayout = {
  /** 星の数 = イベントの日数 */
  dayCount: number
  /** 星座座標系での星の位置 (day1 が index 0) */
  stars: readonly (readonly [number, number])[]
  /** 星座の重心。フィナーレでズームアウトする際のカメラ中心 */
  centroid: readonly [number, number]
  /** フィナーレで全体が画面に収まるズーム係数 */
  finaleK: number
  /** 1日目からの累積距離 (連鎖描画の速度を一定に見せるため距離ベースで進める) */
  chainCumulativeLength: readonly number[]
  /** 星座の全長 */
  chainTotalLength: number
}

/** フィナーレで星座全体を収める領域 (ヘッダーとバナーの余白を除いた分) */
const FINALE_FIT_W = VIEW_W - 60
const FINALE_FIT_H = VIEW_H - 220
const FINALE_K_MIN = 0.5
const FINALE_K_MAX = 1.6

/**
 * 重心を画面中心に置いたとき、全ての星が FINALE_FIT_W × FINALE_FIT_H に
 * 収まる最大のズーム係数。星が1点だけ (広がり0) のときは上限を返す。
 */
const finaleKForStars = (
  stars: readonly (readonly [number, number])[],
  centroid: readonly [number, number]
): number => {
  let halfW = 0
  let halfH = 0
  for (const [x, y] of stars) {
    halfW = Math.max(halfW, Math.abs(x - centroid[0]))
    halfH = Math.max(halfH, Math.abs(y - centroid[1]))
  }
  const kw = halfW > 0 ? FINALE_FIT_W / 2 / halfW : FINALE_K_MAX
  const kh = halfH > 0 ? FINALE_FIT_H / 2 / halfH : FINALE_K_MAX
  return Math.min(FINALE_K_MAX, Math.max(FINALE_K_MIN, Math.min(kw, kh)))
}

/** 星の並びから ConstellationLayout を組み立てる (finaleK は明示指定で上書きできる) */
export const layoutFromStars = (
  stars: readonly (readonly [number, number])[],
  options?: { finaleK?: number }
): ConstellationLayout => {
  const safeStars = stars.length > 0 ? stars : STARS.slice(0, 1)
  const centroid: readonly [number, number] = [
    safeStars.reduce((sum, [x]) => sum + x, 0) / safeStars.length,
    safeStars.reduce((sum, [, y]) => sum + y, 0) / safeStars.length,
  ]

  const chainCumulativeLength = [0]
  for (let i = 1; i < safeStars.length; i++) {
    chainCumulativeLength.push(
      chainCumulativeLength[i - 1] +
        Math.hypot(safeStars[i][0] - safeStars[i - 1][0], safeStars[i][1] - safeStars[i - 1][1])
    )
  }

  return {
    dayCount: safeStars.length,
    stars: safeStars,
    centroid,
    finaleK: options?.finaleK ?? finaleKForStars(safeStars, centroid),
    chainCumulativeLength,
    chainTotalLength: chainCumulativeLength[chainCumulativeLength.length - 1],
  }
}

/** 手作り30点のレイアウト (デザインの正)。finaleK は既存の 1.15 を維持する */
export const DEFAULT_LAYOUT: ConstellationLayout = layoutFromStars(STARS, { finaleK: FINALE_K })

/** 手作り30点を先頭から dayCount 個だけ使うレイアウト (シードなしの検証ページ用) */
export const sliceDefaultLayout = (dayCount: number): ConstellationLayout => {
  const n = Math.min(MAX_DAYS, Math.max(1, Math.round(dayCount)))
  return n === MAX_DAYS ? DEFAULT_LAYOUT : layoutFromStars(STARS.slice(0, n))
}

/** 星座の重心 (手作り30点)。DEFAULT_LAYOUT.centroid と同値 */
export const CONSTELLATION_CENTROID: readonly [number, number] = DEFAULT_LAYOUT.centroid

/** day (1始まり) に対応する星。日数が変わる瞬間の範囲外参照を防ぐためクランプする */
export const starAt = (
  layout: ConstellationLayout,
  day: number
): readonly [number, number] =>
  layout.stars[Math.min(layout.stars.length, Math.max(1, day)) - 1]

/*
 * ==========================================
 * フィナーレ関連の定数
 * ========================================== */

/** フィナーレ4段構成の時間割 (ms) */
export const FINALE_T_ZOOM = 1900
export const FINALE_T_CHAIN = 2800
export const FINALE_T_BLOOM = 900
export const FINALE_T_END = FINALE_T_ZOOM + FINALE_T_CHAIN + FINALE_T_BLOOM + 500
