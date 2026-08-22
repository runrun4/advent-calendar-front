// ==========================================
// StarField の描画データ生成 (幾何 = 状態からの純粋な導出)
// 星は「フォーカスへの近さ」を bigness(0..1) として連続補間する。
// 大きな中央星と中サイズの星を別要素で描き分けると、切替の瞬間に
// 見た目が飛ぶ (IMPLEMENTATION_NOTES §1-2)。線も同じ理由で、
// 描画窓 focus-2 〜 max(focus+1, target) から毎フレーム組み立てる。
// design/ConstellationCalendar.dc.html の renderVals() が正
// ========================================== */
import { CHAIN_R, MEMBER_TOTAL, REL_SHARD_IN, REL_SHATTER, arcPath } from '../data/coop'
import {
  CHAIN_CUMULATIVE_LENGTH,
  CHAIN_TOTAL_LENGTH,
  FINALE_T_BLOOM,
  FINALE_T_CHAIN,
  FINALE_T_ZOOM,
  K_IDLE,
  SCREEN_CX,
  SCREEN_CY,
  STARS,
  TOTAL_DAYS,
  dayStateOf as stateOfDay,
  dirTo,
} from '../data/constellationLayout'
import type { Phase } from '../types/constellation'
import type { CameraState } from '../hooks/useCamera'
import { clamp01, easeInOutCubic, easeOutCubic, lerp } from '../utils/easing'

export type SolidLine = { key: string; x1: number; y1: number; x2: number; y2: number; glowWidth: number; coreWidth: number }
export type DashLine = { key: string; x1: number; y1: number; x2: number; y2: number; width: number; opacity: number }

export type StarVisual = {
  day: number
  x: number
  y: number
  halo: number
  crossScale: number
  crossOpacity: number
  sparkleSize: number
  coreR: number
  smallLabelOpacity: number
  smallLabelOffset: number
  smallLabelFontSize: number
  bigLabelOpacity: number
  bigLabelOffsetY: number
  ignite: boolean
}

export type OpenableVisual = { day: number; x: number; y: number; scale: number; opacity: number; hintOpacity: number }

export type ChainedVisual = {
  day: number
  x: number
  y: number
  scale: number
  opacity: number
  haloOpacity: number
  coreOpacity: number
  labelOpacity: number
  labelFontSize: number
}

export type ChainArc = { key: string; x: number; y: number; d: string; opacity: number; width: number }
export type ChainNode = { key: string; x: number; y: number; lx: number; ly: number; r: number; opacity: number }
export type Shard = { key: string; x: number; y: number; r: number; opacity: number }

export type FinaleStar = { day: number; x: number; y: number; scale: number; opacity: number }
export type Hint = { x: number; y: number; deg: number }
export type Bloom = { r: number; opacity: number }

export type Scene = {
  finale: boolean
  traveling: boolean
  travelBlurPx: number
  showFog: boolean
  solidLines: SolidLine[]
  dashLines: DashLine[]
  stars: StarVisual[]
  openables: OpenableVisual[]
  chained: ChainedVisual[]
  chainArcs: ChainArc[]
  chainNodes: ChainNode[]
  shards: Shard[]
  finaleStars: FinaleStar[]
  finaleChainPoints: string | null
  chainHead: { x: number; y: number } | null
  ghostPathPoints: string | null
  bloom: Bloom | null
  bannerVisible: boolean
  finaleExitVisible: boolean
  travelLabelOpacity: number | null
  nextHint: Hint | null
  backHint: Hint | null
}

export type SceneInput = {
  opened: number
  maxAccessibleDay: number
  focusDay: number
  tp: number
  travelTargetDay: number | null
  camera: CameraState
  phase: Phase
  finaleT: number
  justOpenedDay: number | null
  isChained: (day: number) => boolean
  coopT: number
  myWritten: boolean
  writtenCount: number
}

const project = (camera: CameraState, p: readonly [number, number]): [number, number] => [
  SCREEN_CX + (p[0] - camera.cx) * camera.k,
  SCREEN_CY + (p[1] - camera.cy) * camera.k,
]

export const buildScene = (input: SceneInput): Scene => {
  const { opened, maxAccessibleDay, focusDay, tp, travelTargetDay, camera, phase, finaleT, justOpenedDay, isChained, coopT, myWritten, writtenCount } = input

  if (phase === 'finale') {
    const chainRaw = clamp01((finaleT - FINALE_T_ZOOM) / FINALE_T_CHAIN)
    const chain = easeInOutCubic(chainRaw) * CHAIN_TOTAL_LENGTH

    const pts: string[] = []
    let lastIdx = 0
    for (let i = 0; i < TOTAL_DAYS; i++) {
      if (CHAIN_CUMULATIVE_LENGTH[i] <= chain) {
        const q = project(camera, STARS[i])
        pts.push(`${q[0].toFixed(1)},${q[1].toFixed(1)}`)
        lastIdx = i
      }
    }
    let chainHead: { x: number; y: number } | null = null
    if (lastIdx < TOTAL_DAYS - 1 && chain > 0) {
      const segLen = CHAIN_CUMULATIVE_LENGTH[lastIdx + 1] - CHAIN_CUMULATIVE_LENGTH[lastIdx]
      const f = clamp01((chain - CHAIN_CUMULATIVE_LENGTH[lastIdx]) / (segLen || 1))
      const hp: [number, number] = [
        lerp(STARS[lastIdx][0], STARS[lastIdx + 1][0], f),
        lerp(STARS[lastIdx][1], STARS[lastIdx + 1][1], f),
      ]
      const q = project(camera, hp)
      pts.push(`${q[0].toFixed(1)},${q[1].toFixed(1)}`)
      if (chainRaw > 0 && chainRaw < 1) chainHead = { x: q[0], y: q[1] }
    }
    const finaleChainPoints = pts.length > 1 ? pts.join(' ') : null

    const ghostPathPoints =
      chainRaw > 0
        ? STARS.map((p) => {
            const q = project(camera, p)
            return `${q[0].toFixed(1)},${q[1].toFixed(1)}`
          }).join(' ')
        : null

    const chainDone = chainRaw >= 1
    const finaleStars: FinaleStar[] = []
    for (let i = 0; i < TOTAL_DAYS; i++) {
      // 最終星 (累積長 = 全長) が点灯しない取りこぼしを防ぐ (IMPLEMENTATION_NOTES §1-3)
      const ov = chainDone ? 1 : clamp01((chain - CHAIN_CUMULATIVE_LENGTH[i]) / 30)
      if (ov <= 0 && !(i === 0 && chainRaw > 0)) continue
      const scv = ov < 0.5 ? 0.2 + (ov / 0.5) * 1.15 : 1.35 - ((ov - 0.5) / 0.5) * 0.35
      const q = project(camera, STARS[i])
      finaleStars.push({ day: i + 1, x: q[0], y: q[1], scale: scv, opacity: clamp01(ov * 4) })
    }

    const bp = clamp01((finaleT - FINALE_T_ZOOM - FINALE_T_CHAIN) / FINALE_T_BLOOM)
    const bloom: Bloom | null = bp > 0 && bp < 1 ? { r: 120 + 300 * bp, opacity: Math.sin(Math.PI * bp) * 0.9 } : null
    const bannerVisible = finaleT > FINALE_T_ZOOM + FINALE_T_CHAIN * 0.88
    const finaleExitVisible = finaleT >= FINALE_T_ZOOM + FINALE_T_CHAIN + FINALE_T_BLOOM * 0.6

    return {
      finale: true,
      traveling: false,
      travelBlurPx: 0,
      showFog: false,
      solidLines: [],
      dashLines: [],
      stars: [],
      openables: [],
      chained: [],
      chainArcs: [],
      chainNodes: [],
      shards: [],
      finaleStars,
      finaleChainPoints,
      chainHead,
      ghostPathPoints,
      bloom,
      bannerVisible,
      finaleExitVisible,
      travelLabelOpacity: null,
      nextHint: null,
      backHint: null,
    }
  }

  const m = camera.k / K_IDLE
  const traveling = travelTargetDay !== null
  const a = Math.abs(tp)

  const bigness = (day: number): number => {
    if (!traveling) return day === focusDay ? 1 : 0
    if (day === focusDay) return 1 - a
    if (day === travelTargetDay) return a
    return 0
  }

  const winFrom = Math.max(1, focusDay - 2)
  const winTo = Math.min(maxAccessibleDay, Math.max(focusDay + 1, travelTargetDay ?? 0))

  const solidLines: SolidLine[] = []
  const dashLines: DashLine[] = []
  for (let d = winFrom; d < winTo; d++) {
    const p = project(camera, STARS[d - 1])
    const q = project(camera, STARS[d])
    const isOpenedLink = stateOfDay(d + 1, opened) === 'opened' && !isChained(d) && !isChained(d + 1)
    if (isOpenedLink) {
      solidLines.push({ key: `line-${d}`, x1: p[0], y1: p[1], x2: q[0], y2: q[1], glowWidth: 7 * m, coreWidth: 2 * m })
    } else {
      dashLines.push({ key: `dash-${d}`, x1: p[0], y1: p[1], x2: q[0], y2: q[1], width: 1.6 * m, opacity: 0.35 })
    }
  }

  const stars: StarVisual[] = []
  const openables: OpenableVisual[] = []
  const chained: ChainedVisual[] = []
  const chainArcs: ChainArc[] = []
  const chainNodes: ChainNode[] = []
  const shards: Shard[] = []

  for (let d = winFrom; d <= winTo; d++) {
    const q = project(camera, STARS[d - 1])
    const bb = bigness(d)

    if (isChained(d)) {
      const g = lerp(0.34, 1, bb) * m
      const shatter = clamp01(coopT / REL_SHATTER)
      const R = (CHAIN_R + 26 * shatter) * g

      chained.push({
        day: d,
        x: q[0],
        y: q[1],
        scale: g,
        opacity: 0.5 + 0.5 * bb,
        haloOpacity: myWritten ? 0.42 : 0.16,
        coreOpacity: (myWritten ? 0.5 : 0.26) * (1 - shatter) + shatter,
        labelOpacity: (myWritten ? 0.85 : 0.5) * (0.5 + 0.5 * bb),
        labelFontSize: 38 * g,
      })

      for (let i = 0; i < MEMBER_TOTAL; i++) {
        const done = i < writtenCount
        const a0 = -90 + i * 60 + 7
        const a1 = -90 + (i + 1) * 60 - 7
        const linkOpacity = done ? 0.1 : 0.9 * (1 - shatter)
        chainArcs.push({
          key: `arc-${d}-${i}`,
          x: q[0],
          y: q[1],
          d: arcPath(R, a0, a1),
          opacity: linkOpacity * (0.55 + 0.45 * bb),
          width: 3.4 * g,
        })
        const na = ((-90 + i * 60) * Math.PI) / 180
        chainNodes.push({
          key: `node-${d}-${i}`,
          x: q[0],
          y: q[1],
          lx: Math.cos(na) * R,
          ly: Math.sin(na) * R,
          r: 3.2 * g,
          opacity: linkOpacity * (0.55 + 0.45 * bb),
        })
      }

      // 解放演出: 6つの破片が外へ弾けてから星へ吸い込まれる
      if (coopT > REL_SHATTER * 0.6) {
        const t2 = clamp01((coopT - REL_SHATTER * 0.6) / (REL_SHARD_IN - REL_SHATTER * 0.6))
        for (let i = 0; i < MEMBER_TOTAL; i++) {
          const angle = ((-90 + i * 60 + 30) * Math.PI) / 180
          const dist =
            t2 < 0.32
              ? lerp(R, R + 58 * g, easeOutCubic(t2 / 0.32))
              : lerp(R + 58 * g, 6 * g, easeOutCubic((t2 - 0.32) / 0.68))
          shards.push({
            key: `shard-${d}-${i}`,
            x: q[0] + Math.cos(angle) * dist,
            y: q[1] + Math.sin(angle) * dist,
            r: lerp(4.6, 1.6, t2) * g,
            opacity: t2 > 0.92 ? (1 - t2) / 0.08 : 1,
          })
        }
      }
    } else if (stateOfDay(d, opened) === 'openable') {
      const g = lerp(0.3, 1, bb) * m
      openables.push({ day: d, x: q[0], y: q[1], scale: g, opacity: 0.42 + 0.58 * bb, hintOpacity: bb })
    } else {
      stars.push({
        day: d,
        x: q[0],
        y: q[1],
        halo: lerp(30, 118, bb) * m,
        crossScale: lerp(0.2, 1, bb) * m,
        crossOpacity: bb * 0.42,
        sparkleSize: lerp(18, 56, bb) * m,
        coreR: lerp(3, 5.5, bb) * m,
        smallLabelOpacity: 0.7 * (1 - bb),
        smallLabelOffset: lerp(24, 46, bb) * m,
        smallLabelFontSize: Math.min(22, 15 * m),
        bigLabelOpacity: bb,
        bigLabelOffsetY: -142 * m,
        ignite: justOpenedDay === d,
      })
    }
  }

  let backHint: Hint | null = null
  let nextHint: Hint | null = null
  let travelLabelOpacity: number | null = null

  if (!traveling) {
    if (focusDay > 1) {
      const bd = dirTo(STARS[focusDay - 1], STARS[focusDay - 2])
      backHint = { x: SCREEN_CX + bd[0] * 128, y: SCREEN_CY + bd[1] * 128, deg: (Math.atan2(bd[1], bd[0]) * 180) / Math.PI }
    }
    if (focusDay < TOTAL_DAYS && stateOfDay(focusDay, opened) === 'opened' && stateOfDay(focusDay + 1, opened) !== 'locked') {
      const nd = dirTo(STARS[focusDay - 1], STARS[focusDay])
      nextHint = { x: SCREEN_CX + nd[0] * 118, y: SCREEN_CY + nd[1] * 118, deg: (Math.atan2(nd[1], nd[0]) * 180) / Math.PI }
    }
  } else {
    travelLabelOpacity = Math.sin(Math.PI * a)
  }

  return {
    finale: false,
    traveling,
    travelBlurPx: traveling ? Math.sin(Math.PI * a) * 1.6 : 0,
    showFog: true,
    solidLines,
    dashLines,
    stars,
    openables,
    chained,
    chainArcs,
    chainNodes,
    shards,
    finaleStars: [],
    finaleChainPoints: null,
    chainHead: null,
    ghostPathPoints: null,
    bloom: null,
    bannerVisible: false,
    finaleExitVisible: false,
    travelLabelOpacity,
    nextHint,
    backHint,
  }
}
