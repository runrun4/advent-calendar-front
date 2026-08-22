// ==========================================
// StarField: 星座の SVG 描画層
// 幾何 (どの星・線をどんな大きさ/不透明度で描くか) は starFieldScene.buildScene が
// 状態から連続的に導出する。このコンポーネントは Scene を JSX に変換するだけ。
// ==========================================
import { useMemo } from 'react'
import {
  BG_LAYER_A,
  BG_LAYER_B,
  BG_LAYER_C,
  CONSTELLATION_CENTROID,
  SCREEN_CX,
  SCREEN_CY,
  VIEW_H,
  VIEW_W,
  sparklePath,
} from '../data/constellationLayout'
import type { BgStarVisual } from '../data/constellationLayout'
import type { CameraState } from '../hooks/useCamera'
import type { Scene } from './starFieldScene'
import './StarField.css'

type StarFieldProps = {
  scene: Scene
  camera: CameraState
}

const STAR = 'var(--star, #ffd98a)'

export const StarField = ({ scene, camera }: StarFieldProps) => {
  // 背景3層のパララックスオフセット (カメラ移動量の 2% / 5% / 9% だけ逆方向へ)
  const [p1, p2, p3] = useMemo(() => {
    const dx = camera.cx - CONSTELLATION_CENTROID[0]
    const dy = camera.cy - CONSTELLATION_CENTROID[1]
    const par = (f: number): [number, number] => [-(dx * f), -(dy * f)]
    return [par(0.02), par(0.05), par(0.09)]
  }, [camera.cx, camera.cy])

  return (
    <svg
      className="star-field"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label={scene.finale ? '完成した星座' : '星座'}
    >
      <defs>
        <radialGradient id="cc-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={STAR} stopOpacity="0.4" />
          <stop offset="0.5" stopColor={STAR} stopOpacity="0.11" />
          <stop offset="1" stopColor={STAR} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cc-bloom" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff7e0" stopOpacity="0.85" />
          <stop offset="0.4" stopColor={STAR} stopOpacity="0.3" />
          <stop offset="1" stopColor={STAR} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cc-fog" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#05081a" stopOpacity="0" />
          <stop offset="1" stopColor="#05081a" stopOpacity="0.92" />
        </linearGradient>
        <filter id="cc-soft" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      <BgLayer stars={BG_LAYER_A} fill="#ffffff" offset={p1} />
      <BgLayer stars={BG_LAYER_B} fill="#dfe6ff" offset={p2} />
      <BgLayer stars={BG_LAYER_C} fill="#fff4dc" offset={p3} />

      <g className="star-field__drift">
        {scene.ghostPathPoints && (
          <polyline points={scene.ghostPathPoints} fill="none" stroke="#ffffff" strokeOpacity="0.09" strokeWidth="1" strokeDasharray="1 5" />
        )}

        {scene.solidLines.map((l) => (
          <line key={`glow-${l.key}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={STAR} strokeOpacity="0.22" strokeWidth={l.glowWidth} strokeLinecap="round" filter="url(#cc-soft)" />
        ))}
        {scene.solidLines.map((l) => (
          <line key={`core-${l.key}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={STAR} strokeOpacity="0.85" strokeWidth={l.coreWidth} strokeLinecap="round" />
        ))}
        {scene.dashLines.map((l) => (
          <line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={STAR} strokeOpacity={l.opacity} strokeWidth={l.width} strokeDasharray="3 6" strokeLinecap="round" />
        ))}

        {scene.finaleChainPoints && (
          <g>
            <polyline points={scene.finaleChainPoints} fill="none" stroke={STAR} strokeOpacity="0.22" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" filter="url(#cc-soft)" />
            <polyline points={scene.finaleChainPoints} fill="none" stroke={STAR} strokeOpacity="0.9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
        {scene.chainHead && (
          <g transform={`translate(${scene.chainHead.x} ${scene.chainHead.y})`}>
            <circle r="18" fill="url(#cc-bloom)" />
            <circle r="3.4" fill="#fff9ea" />
          </g>
        )}

        <g style={scene.traveling ? { filter: `blur(${scene.travelBlurPx.toFixed(2)}px)` } : undefined}>
          {scene.stars.map((s) => (
            <g key={s.day} transform={`translate(${s.x} ${s.y})`} className="star-field__star">
              <g className={s.ignite ? 'star-field__ignite' : undefined}>
                <circle r={s.halo} fill="url(#cc-halo)" />
                <g transform={`scale(${s.crossScale})`} opacity={s.crossOpacity}>
                  <g className="star-field__cross-spin">
                    <path d="M 0 -102 L 4.5 0 L 0 102 L -4.5 0 Z" fill={STAR} />
                    <path d="M -102 0 L 0 4.5 L 102 0 L 0 -4.5 Z" fill={STAR} />
                  </g>
                </g>
                <path d={sparklePath(s.sparkleSize)} fill={STAR} className="star-field__breathe" />
                <circle r={s.coreR} fill="#ffffff" fillOpacity="0.94" />
              </g>
              <text x={s.smallLabelOffset} y="4" fontSize={s.smallLabelFontSize} fill="#e9edff" fillOpacity={s.smallLabelOpacity} dominantBaseline="central">
                {s.day}
              </text>
              {s.bigLabelOpacity > 0.02 && (
                <text y={s.bigLabelOffsetY} textAnchor="middle" dominantBaseline="central" fontSize="15" fontWeight="700" letterSpacing="4" fill={STAR} opacity={s.bigLabelOpacity}>
                  DAY {s.day}
                </text>
              )}
            </g>
          ))}

          {scene.chained.map((c) => (
            <g key={c.day} transform={`translate(${c.x} ${c.y})`} opacity={c.opacity}>
              <g transform={`scale(${c.scale})`}>
                <circle r="74" fill="url(#cc-halo)" opacity={c.haloOpacity} className="star-field__chain-breathe" />
                <path d={sparklePath(30)} fill={STAR} fillOpacity={c.coreOpacity} />
                <circle r="2.6" fill="#ffffff" fillOpacity={c.coreOpacity} />
              </g>
              <text y={2 * c.scale} textAnchor="middle" dominantBaseline="central" fontSize={c.labelFontSize} fontWeight="700" fill={STAR} opacity={c.labelOpacity}>
                {c.day}
              </text>
            </g>
          ))}
          {scene.chainArcs.map((c) => (
            <g key={c.key} transform={`translate(${c.x} ${c.y})`}>
              <g className="star-field__chain-spin">
                <path d={c.d} fill="none" stroke="#cfd8f5" strokeOpacity={c.opacity} strokeWidth={c.width} strokeLinecap="round" />
              </g>
            </g>
          ))}
          {scene.chainNodes.map((n) => (
            <g key={n.key} transform={`translate(${n.x} ${n.y})`}>
              <g className="star-field__chain-spin">
                <circle cx={n.lx} cy={n.ly} r={n.r} fill="#e6ecff" fillOpacity={n.opacity} />
              </g>
            </g>
          ))}
          {scene.shards.map((s) => (
            <circle key={s.key} cx={s.x} cy={s.y} r={s.r} fill="#fff6de" opacity={s.opacity} />
          ))}

          {scene.openables.map((p) => (
            <g key={p.day} transform={`translate(${p.x} ${p.y})`} opacity={p.opacity}>
              <g transform={`scale(${p.scale})`}>
                <circle r="96" fill="url(#cc-halo)" className="star-field__openable-breathe" />
                <circle r="62" fill="none" stroke={STAR} strokeOpacity="0.5" strokeWidth="1.4" className="star-field__ring1" />
                <circle r="62" fill="none" stroke={STAR} strokeOpacity="0.4" strokeWidth="1.2" className="star-field__ring2" />
                <circle r="64" fill="none" stroke={STAR} strokeOpacity="0.8" strokeWidth="1.6" strokeDasharray="5 8" className="star-field__orbit-cw" />
                <circle r="80" fill="none" stroke={STAR} strokeOpacity="0.28" strokeWidth="1" strokeDasharray="2 12" className="star-field__orbit-ccw" />
                <path d={sparklePath(46)} fill="none" stroke={STAR} strokeOpacity="0.42" strokeWidth="1.4" className="star-field__hint-breathe" />
                <text y="16" textAnchor="middle" dominantBaseline="central" fontSize={44 * p.scale} fontWeight="700" fill={STAR}>
                  {p.day}
                </text>
                <text y="108" textAnchor="middle" fontSize="14" fontWeight="500" fill="rgba(233,237,255,0.75)" opacity={p.hintOpacity} className="star-field__hint-tw">
                  タップでひらく
                </text>
              </g>
            </g>
          ))}

          {scene.lockeds.map((p) => (
            <g key={`locked-${p.day}`} transform={`translate(${p.x} ${p.y})`} opacity={p.opacity}>
              <g transform={`scale(${p.scale})`}>
                <circle r="72" fill="none" stroke={STAR} strokeOpacity="0.28" strokeWidth="1.2" strokeDasharray="3 7" />
                <circle r="5.5" fill={STAR} fillOpacity="0.35" />
                <circle r="2.2" fill="#ffffff" fillOpacity="0.45" />
                <text y="16" textAnchor="middle" dominantBaseline="central" fontSize={36 * Math.max(0.55, p.scale)} fontWeight="600" fill="rgba(233,237,255,0.55)">
                  {p.day}
                </text>
                <text y="96" textAnchor="middle" fontSize="13" fontWeight="500" fill="rgba(233,237,255,0.55)" opacity={p.hintOpacity}>
                  ひらけなかった日
                </text>
              </g>
            </g>
          ))}
        </g>

        {scene.finaleStars.map((s) => (
          <g key={s.day} transform={`translate(${s.x} ${s.y})`} opacity={s.opacity}>
            <g style={{ transform: `scale(${s.scale})` }}>
              <circle r="13" fill={STAR} fillOpacity="0.13" />
              <circle r="6" fill={STAR} fillOpacity="0.3" />
              <path d={sparklePath(7)} fill={STAR} />
              <circle r="1.7" fill="#ffffff" fillOpacity="0.95" />
              <text x="11" fontSize="9" fill="rgba(233,237,255,0.6)" dominantBaseline="central">
                {s.day}
              </text>
            </g>
          </g>
        ))}

        {scene.nextHint && (
          <g transform={`translate(${scene.nextHint.x} ${scene.nextHint.y}) rotate(${scene.nextHint.deg})`} opacity="0.6" className="star-field__chevron-tw">
            <path d="M -5 -7 L 3 0 L -5 7" fill="none" stroke={STAR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
        {scene.backHint && (
          <g transform={`translate(${scene.backHint.x} ${scene.backHint.y}) rotate(${scene.backHint.deg})`} opacity="0.35">
            <path d="M -5 -7 L 3 0 L -5 7" fill="none" stroke="#e9edff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
      </g>

      {scene.showFog && <rect x={VIEW_W - 90} y="0" width="90" height={VIEW_H} fill="url(#cc-fog)" />}
      {scene.bloom && <circle cx={SCREEN_CX} cy={SCREEN_CY} r={scene.bloom.r} fill="url(#cc-bloom)" opacity={scene.bloom.opacity} />}
      {scene.travelLabelOpacity !== null && (
        <text x={SCREEN_CX} y={VIEW_H - 24} textAnchor="middle" fontSize="12" letterSpacing="1" fill="rgba(233,237,255,0.6)" opacity={scene.travelLabelOpacity}>
          線をたどって星へ
        </text>
      )}
    </svg>
  )
}

const BgLayer = ({ stars, fill, offset }: { stars: readonly BgStarVisual[]; fill: string; offset: [number, number] }) => (
  <g transform={`translate(${offset[0].toFixed(1)} ${offset[1].toFixed(1)})`}>
    {stars.map((s, i) => (
      <circle
        key={i}
        cx={s.x}
        cy={s.y}
        r={s.r}
        fill={fill}
        fillOpacity={s.o}
        style={{ animation: `cc-tw ${s.dur.toFixed(2)}s ease-in-out infinite ${s.delay.toFixed(2)}s` }}
      />
    ))}
  </g>
)
