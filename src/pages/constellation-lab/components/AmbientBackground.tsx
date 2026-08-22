// ==========================================
// AmbientBackground: 星雲3枚のドリフト + 流れ星3本
// 画面全体を覆う装飾レイヤー (pointer-events: none)。
// design/ConstellationCalendar.dc.html の nebula/shooters が正 (IMPLEMENTATION_NOTES §2-1)
// ==========================================
import './AmbientBackground.css'

type Shooter = { top: number; left: number; dur: number; delay: number }

const SHOOTERS: readonly Shooter[] = [
  { top: 60, left: -140, dur: 17, delay: 3 },
  { top: 200, left: -160, dur: 23, delay: 11 },
  { top: 420, left: -120, dur: 29, delay: 19 },
]

type AmbientBackgroundProps = {
  /** 流れ星の表示可否 (reduced-motion環境では出さない) */
  showShooters: boolean
}

export const AmbientBackground = ({ showShooters }: AmbientBackgroundProps) => (
  <div className="ambient-bg">
    <div className="ambient-bg__nebula ambient-bg__nebula--blue" />
    <div className="ambient-bg__nebula ambient-bg__nebula--orange" />
    <div className="ambient-bg__nebula ambient-bg__nebula--violet" />
    {showShooters &&
      SHOOTERS.map((s, i) => (
        <div
          key={i}
          className="ambient-bg__shooter"
          style={{ top: s.top, left: s.left, animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }}
        />
      ))}
  </div>
)
