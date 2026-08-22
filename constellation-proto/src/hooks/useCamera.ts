// ==========================================
// カメラ + スワイプ操作
// フォーカス星を中心に画面いっぱいにズームし、指の動きを
// 「フォーカス星から次/前の星へ向かう単位ベクトル」に射影して
// 星をつなぐ線に沿ってしか進めないようにする (IMPLEMENTATION_NOTES §1-1)。
// タップ判定・長押し(協力デイの鎖の内訳表示)もここに集約する。
// ==========================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  DRAG_PX,
  K_DOLLY,
  K_IDLE,
  SNAP_MS,
  STARS,
  dirTo,
} from '../data/constellationLayout'
import { clamp, clamp01, easeOutCubic, lerp } from '../utils/easing'

export type CameraState = { cx: number; cy: number; k: number }

const TAP_DISTANCE_PX = 8
const TAP_DURATION_MS = 400
const LONGPRESS_CANCEL_DISTANCE_PX = 8

type DragInfo = {
  id: number
  x: number
  y: number
  t: number
  el: HTMLElement
}

type UseCameraParams = {
  focusDay: number
  /** ナビゲート可能な最大日 (開封済み+openableのみ移動できる) */
  maxAccessibleDay: number
  /** phase === 'daily' の間だけ操作を受け付ける */
  active: boolean
  /** 現在の鎖 (協力デイで未解放) を長押ししたらメンバー一覧を開く */
  isLongPressTarget: boolean
  longPressMs: number
  onLongPress: () => void
  /** タップ (開封 / カード表示 / 協力デイの自分の分を書く 等) */
  onTap: () => void
  /** スワイプ確定。direction: +1=次の星へ, -1=前の星へ */
  onCommit: (direction: 1 | -1) => void
}

export type UseCameraReturn = {
  tp: number
  travelTargetDay: number | null
  camera: CameraState
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void
  /** カード閉じ後、自動で次の星へ寄っていくカメラワーク */
  glide: (ms: number) => void
  /** raf/長押しタイマー/ポインタ捕捉を全て解放し tp を 0 に戻す */
  cancelAll: () => void
}

export const useCamera = ({
  focusDay,
  maxAccessibleDay,
  active,
  isLongPressTarget,
  longPressMs,
  onLongPress,
  onTap,
  onCommit,
}: UseCameraParams): UseCameraReturn => {
  const [tp, setTp] = useState(0)

  const dragRef = useRef<DragInfo | null>(null)
  const dragBaseRef = useRef(0)
  const pressTimerRef = useRef<number | null>(null)
  const longPressedRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const cancelPress = useCallback(() => {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }, [])

  const releaseDrag = useCallback(() => {
    const d = dragRef.current
    if (d) {
      try {
        d.el.releasePointerCapture(d.id)
      } catch {
        /* noop */
      }
      dragRef.current = null
    }
  }, [])

  useEffect(
    () => () => {
      stopRaf()
      cancelPress()
    },
    [stopRaf, cancelPress]
  )

  const animateTp = useCallback(
    (from: number, to: number, ms: number, done: () => void) => {
      stopRaf()
      const start = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / ms)
        setTp(lerp(from, to, easeOutCubic(t)))
        if (t < 1) {
          rafRef.current = requestAnimationFrame(step)
        } else {
          rafRef.current = null
          done()
        }
      }
      rafRef.current = requestAnimationFrame(step)
    },
    [stopRaf]
  )

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!active) return
      stopRaf()
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* noop */
      }
      dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), el: e.currentTarget }
      dragBaseRef.current = tp
      if (isLongPressTarget) {
        pressTimerRef.current = window.setTimeout(() => {
          pressTimerRef.current = null
          longPressedRef.current = true
          onLongPress()
        }, longPressMs)
      }
    },
    [active, isLongPressTarget, longPressMs, onLongPress, stopRaf, tp]
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = dragRef.current
      if (!d || d.id !== e.pointerId) return
      if (!active) {
        cancelPress()
        releaseDrag()
        return
      }

      const dx = e.clientX - d.x
      const dy = e.clientY - d.y
      if (Math.hypot(dx, dy) > LONGPRESS_CANCEL_DISTANCE_PX) cancelPress()

      const canNext = focusDay < maxAccessibleDay
      const canPrev = focusDay > 1

      // 指の動きを「次/前の星へ向かう線」に射影する。
      // カメラが星へ寄る = 画面の中身は逆方向に動く → 指の向きは -dir。
      let best = 0
      if (canNext) {
        const n = dirTo(STARS[focusDay - 1], STARS[focusDay])
        best = Math.max(best, (dx * -n[0] + dy * -n[1]) / DRAG_PX)
      }
      let bestPrev = 0
      if (canPrev) {
        const p = dirTo(STARS[focusDay - 1], STARS[focusDay - 2])
        bestPrev = Math.max(bestPrev, (dx * -p[0] + dy * -p[1]) / DRAG_PX)
      }

      const signed = best >= bestPrev ? Math.max(0, best) : -Math.max(0, bestPrev)
      setTp(clamp(dragBaseRef.current + signed, -1, 1))
    },
    [active, cancelPress, focusDay, maxAccessibleDay, releaseDrag]
  )

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = dragRef.current
      if (!d || d.id !== e.pointerId) return
      const distance = Math.hypot(e.clientX - d.x, e.clientY - d.y)
      const duration = performance.now() - d.t
      cancelPress()
      releaseDrag()

      if (longPressedRef.current) {
        longPressedRef.current = false
        setTp(0)
        return
      }
      if (!active) {
        setTp(0)
        return
      }

      if (distance < TAP_DISTANCE_PX && duration < TAP_DURATION_MS) {
        setTp(0)
        onTap()
        return
      }

      setTp((current) => {
        if (Math.abs(current) > 0.45) {
          const direction: 1 | -1 = current > 0 ? 1 : -1
          animateTp(current, direction, SNAP_MS, () => {
            setTp(0)
            onCommit(direction)
          })
        } else {
          animateTp(current, 0, SNAP_MS, () => setTp(0))
        }
        return current
      })
    },
    [active, animateTp, cancelPress, onCommit, onTap, releaseDrag]
  )

  const glide = useCallback(
    (ms: number) => {
      if (focusDay >= maxAccessibleDay) return
      animateTp(0, 1, ms, () => {
        setTp(0)
        onCommit(1)
      })
    },
    [animateTp, focusDay, maxAccessibleDay, onCommit]
  )

  const cancelAll = useCallback(() => {
    stopRaf()
    cancelPress()
    releaseDrag()
    longPressedRef.current = false
    setTp(0)
  }, [cancelPress, releaseDrag, stopRaf])

  const travelTargetDay = useMemo(() => {
    if (Math.abs(tp) < 0.001) return null
    const dir = tp > 0 ? 1 : -1
    const target = focusDay + dir
    if (target < 1 || target > maxAccessibleDay) return null
    return target
  }, [focusDay, maxAccessibleDay, tp])

  const camera = useMemo<CameraState>(() => {
    const focusStar = STARS[focusDay - 1]
    if (travelTargetDay === null) return { cx: focusStar[0], cy: focusStar[1], k: K_IDLE }
    const targetStar = STARS[travelTargetDay - 1]
    const a = clamp01(Math.abs(tp))
    return {
      cx: lerp(focusStar[0], targetStar[0], a),
      cy: lerp(focusStar[1], targetStar[1], a),
      k: K_IDLE + (K_DOLLY - K_IDLE) * Math.sin(Math.PI * a),
    }
  }, [focusDay, tp, travelTargetDay])

  return { tp, travelTargetDay, camera, onPointerDown, onPointerMove, onPointerUp, glide, cancelAll }
}
