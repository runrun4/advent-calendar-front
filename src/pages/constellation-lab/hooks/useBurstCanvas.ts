// ==========================================
// 開封バースト (Canvas 2D, 加算合成)
// WebGLのシェーダコンパイル失敗・コンテキスト喪失フォールバックが不要になり、
// 白い閃光 / 衝撃波リング / 光条 / 粒子(トレイル付き) の4レイヤーを描ける。
// design/ConstellationCalendar.dc.html の burst() が正 (IMPLEMENTATION_NOTES §2-3)
// ==========================================
import { useCallback, useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { clamp01, easeOutCubic } from '../utils/easing'

export type EffectLevel = 'calm' | 'balanced' | 'lush'

type UseBurstCanvasParams = {
  starColor: string
  effectLevel: EffectLevel
  reducedMotion: boolean
}

export type UseBurstCanvasReturn = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  /** strength: 1=通常, 0.45=協力デイの「自分の分を書いた」時の小さめのバースト */
  burst: (strength?: number) => void
  stop: () => void
}

const DUR = 1150

type Particle = { vx: number; vy: number; r: number; tw: number; life: number }
type Ray = { a: number; len: number }

export const useBurstCanvas = ({
  starColor,
  effectLevel,
  reducedMotion,
}: UseBurstCanvasParams): UseBurstCanvasReturn => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dprRef = useRef(1)
  const rafRef = useRef<number | null>(null)

  const sizeCanvas = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    const r = c.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    c.width = Math.max(1, Math.round(r.width * dpr))
    c.height = Math.max(1, Math.round(r.height * dpr))
    dprRef.current = dpr
  }, [])

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  useEffect(() => {
    sizeCanvas()
    const c = canvasRef.current
    window.addEventListener('resize', sizeCanvas)
    if (!c || !window.ResizeObserver) {
      return () => window.removeEventListener('resize', sizeCanvas)
    }
    const ro = new ResizeObserver(sizeCanvas)
    ro.observe(c)
    return () => {
      window.removeEventListener('resize', sizeCanvas)
      ro.disconnect()
    }
  }, [sizeCanvas])

  useEffect(() => stop, [stop])

  const burst = useCallback(
    (strength = 1) => {
      const c = canvasRef.current
      if (!c) return
      const ctx = c.getContext('2d')
      if (!ctx) return
      sizeCanvas()
      stop()

      const K = strength
      const n = Math.round(
        (reducedMotion ? 24 : effectLevel === 'calm' ? 70 : effectLevel === 'lush' ? 210 : 140) * K
      )
      const rayCount = Math.round((reducedMotion ? 0 : effectLevel === 'calm' ? 6 : 12) * K)
      const color = starColor
      const x = c.width / 2
      const y = c.height / 2
      const scale = dprRef.current || 1

      const particles: Particle[] = []
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const core = i < n * 0.1
        const v = (core ? 12 + Math.random() * 30 : 90 + Math.random() * 240) * scale
        particles.push({
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          r: (core ? 2.6 : 0.9 + Math.random() * 1.9) * scale,
          tw: Math.random() * 6.28,
          life: 0.55 + Math.random() * 0.45,
        })
      }
      const rays: Ray[] = []
      for (let i = 0; i < rayCount; i++) {
        rays.push({ a: (i / rayCount) * Math.PI * 2 + Math.random() * 0.3, len: (70 + Math.random() * 130) * scale })
      }

      const start = performance.now()
      const step = (now: number) => {
        const t = clamp01((now - start) / DUR)
        const e = easeOutCubic(t)
        ctx.clearRect(0, 0, c.width, c.height)
        ctx.globalCompositeOperation = 'lighter'

        // 1. 白い閃光
        const flashAlpha = Math.max(0, 1 - t / 0.22)
        if (flashAlpha > 0) {
          const g = ctx.createRadialGradient(x, y, 0, x, y, 130 * scale * (0.3 + e * 1.6))
          g.addColorStop(0, `rgba(255,251,240,${0.9 * flashAlpha})`)
          g.addColorStop(0.45, `rgba(255,226,170,${0.35 * flashAlpha})`)
          g.addColorStop(1, 'rgba(255,226,170,0)')
          ctx.fillStyle = g
          ctx.fillRect(0, 0, c.width, c.height)
        }

        // 2. 衝撃波リング
        const ringAlpha = Math.max(0, 1 - t / 0.65)
        if (ringAlpha > 0) {
          ctx.strokeStyle = color
          ctx.globalAlpha = ringAlpha * 0.55
          ctx.lineWidth = Math.max(0.6, 5 * scale * ringAlpha)
          ctx.beginPath()
          ctx.arc(x, y, 20 * scale + e * 230 * scale, 0, Math.PI * 2)
          ctx.stroke()
          ctx.globalAlpha = 1
        }

        // 3. 光条
        for (const ray of rays) {
          const rayAlpha = Math.max(0, 1 - t / 0.5)
          const length = ray.len * e
          const gx = x + Math.cos(ray.a) * length
          const gy = y + Math.sin(ray.a) * length
          const g = ctx.createLinearGradient(x, y, gx, gy)
          g.addColorStop(0, `rgba(255,247,224,${0.5 * rayAlpha})`)
          g.addColorStop(1, 'rgba(255,247,224,0)')
          ctx.strokeStyle = g
          ctx.lineWidth = 1.6 * scale
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(gx, gy)
          ctx.stroke()
        }

        // 4. 粒子 + トレイル
        particles.forEach((p, i) => {
          const pe = easeOutCubic(Math.min(1, t / p.life))
          const px = x + p.vx * pe
          const py = y + p.vy * pe + 26 * scale * t * t
          const prevT = Math.max(0, t - 0.045)
          const prev = easeOutCubic(Math.min(1, prevT / p.life))
          const lx = x + p.vx * prev
          const ly = y + p.vy * prev + 26 * scale * prevT * prevT
          const alpha =
            (1 - clamp01((t - p.life * 0.5) / (1 - p.life * 0.5 + 0.001))) *
            (0.72 + 0.28 * Math.sin(p.tw + t * 14))
          if (alpha <= 0) return

          ctx.strokeStyle = color
          ctx.globalAlpha = alpha * 0.45
          ctx.lineWidth = p.r
          ctx.beginPath()
          ctx.moveTo(lx, ly)
          ctx.lineTo(px, py)
          ctx.stroke()

          ctx.globalAlpha = alpha
          ctx.fillStyle = i % 5 === 0 ? '#fff8e8' : color
          ctx.beginPath()
          ctx.arc(px, py, p.r, 0, Math.PI * 2)
          ctx.fill()
        })

        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = 'source-over'

        if (t < 1) {
          rafRef.current = requestAnimationFrame(step)
        } else {
          rafRef.current = null
          ctx.clearRect(0, 0, c.width, c.height)
        }
      }
      rafRef.current = requestAnimationFrame(step)
    },
    [effectLevel, reducedMotion, sizeCanvas, starColor, stop]
  )

  return { canvasRef, burst, stop }
}
