// ==========================================
// 協力デイ (day 10) の UI パーツ
// HUD / 解放ボタン / メンバー一覧パネル / 確認カード
// design/ConstellationCalendar.dc.html の coopHud/coopCta/coopPanel/notice が正 (IMPLEMENTATION_NOTES §5)
// ==========================================
import { Unlock, X } from 'lucide-react'
import { MEMBERS, MEMBER_TOTAL } from '../data/coop'
import './CoopDay.css'

/*
 * ==========================================
 * 上部 HUD: 協力デイの進捗と操作ヒント
 * ========================================== */

type CoopHudProps = {
  writtenCount: number
  coopT: number
  myWritten: boolean
  memberTotal?: number
}

export const CoopHud = ({
  writtenCount,
  coopT,
  myWritten,
  memberTotal = MEMBER_TOTAL,
}: CoopHudProps) => {
  const remain = memberTotal - writtenCount
  const note =
    coopT > 0
      ? '鎖がほどけていく'
      : remain > 0
        ? myWritten
          ? `あと${remain}人を待っています`
          : 'タップしてあなたの分を書く'
        : 'ぜんいん そろいました'
  const hint = coopT > 0 ? '' : '鎖を長押しで だれが書いたか'

  return (
    <div className="coop-hud">
      <div className="coop-hud__pill">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#cfd8f5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="5" />
          <circle cx="16" cy="16" r="5" />
        </svg>
        <span className="coop-hud__label">協力デイ</span>
        <span className="coop-hud__count">
          {writtenCount} / {memberTotal}
        </span>
      </div>
      <span className="coop-hud__note">{note}</span>
      {hint && <span className="coop-hud__hint">{hint}</span>}
    </div>
  )
}

/*
 * ==========================================
 * 解放ボタン: 全員そろった後、明示的に押して解放演出へ
 * ========================================== */

type CoopReleaseButtonProps = { onRelease: () => void }

export const CoopReleaseButton = ({ onRelease }: CoopReleaseButtonProps) => (
  <div className="coop-release">
    <button type="button" className="coop-release__button" onClick={onRelease}>
      <Unlock size={16} strokeWidth={2.2} />
      <span>鎖を解放する</span>
    </button>
  </div>
)

/*
 * ==========================================
 * メンバー一覧パネル: 誰が書いた/まだかを長押しで確認
 * ========================================== */

type CoopMemberPanelProps = {
  writtenCount: number
  myWritten: boolean
  othersWritten: number
  memberTotal?: number
  memberNames?: readonly string[]
  onClose: () => void
}

export const CoopMemberPanel = ({
  writtenCount,
  myWritten,
  othersWritten,
  memberTotal = MEMBER_TOTAL,
  memberNames = MEMBERS,
  onClose,
}: CoopMemberPanelProps) => (
  // オーバーレイ上のタップが star-field-wrap までバブリングして camera 側の handleTap と
  // 同時発火しないよう、pointerdown/pointerup 段階で止める (click の stopPropagation だけでは防げない)
  <div
    className="coop-panel-overlay"
    onClick={onClose}
    onPointerDown={(e) => e.stopPropagation()}
    onPointerUp={(e) => e.stopPropagation()}
  >
    <div className="coop-panel" onClick={(e) => e.stopPropagation()}>
      <div className="coop-panel__header">
        <p className="coop-panel__head">
          {writtenCount} / {memberTotal} が書きました
        </p>
        <button type="button" className="coop-panel__close" onClick={onClose} aria-label="とじる">
          <X size={18} strokeWidth={2} />
        </button>
      </div>
      <div className="coop-panel__rows">
        {Array.from({ length: memberTotal }, (_, i) => {
          const name = memberNames[i] ?? `メンバー${i + 1}`
          const done = i === 0 ? myWritten : i <= othersWritten
          return (
            <div key={`${name}-${i}`} className="coop-panel__row">
              <span className="coop-panel__mark" style={{ color: done ? 'var(--star, #ffd98a)' : 'rgba(233,237,255,0.4)' }}>
                {done ? '✓' : '—'}
              </span>
              <span className="coop-panel__name">{name}</span>
              <span className="coop-panel__note" style={{ color: done ? 'var(--star, #ffd98a)' : 'rgba(233,237,255,0.4)' }}>
                {done ? '書いた' : 'まだ'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  </div>
)

/*
 * ==========================================
 * 確認カード: 「あなたの分を書きました」
 * ========================================== */

type CoopNoticeCardProps = { remain: number; onClose: () => void }

export const CoopNoticeCard = ({ remain, onClose }: CoopNoticeCardProps) => {
  const body =
    remain > 0
      ? `のこり${remain}人が書きこむと、鎖がほどけて星がひらきます。`
      : 'ぜんいんの分がそろいました。鎖を解放できます。'
  const cta = remain > 0 ? 'とじる' : 'つづける'

  return (
    // オーバーレイ上のタップが star-field-wrap までバブリングして camera 側の handleTap と
    // 同時発火しないよう、pointerdown/pointerup 段階で止める (click の stopPropagation だけでは防げない)
    <div
      className="coop-notice-overlay"
      onClick={onClose}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <div className="coop-notice" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="coop-notice__close" onClick={onClose} aria-label="とじる">
          <X size={20} strokeWidth={2} />
        </button>
        <p className="coop-notice__label">協力デイ</p>
        <svg width="46" height="46" viewBox="-14 -14 28 28" className="coop-notice__icon">
          <circle r="12" fill="none" stroke="#cfd8f5" strokeOpacity="0.45" strokeWidth="1.6" strokeDasharray="7 6" className="coop-notice__icon-ring" />
          <path
            d="M 0 -7 C 1.40 -1.4 1.40 -1.4 7 0 C 1.40 1.40 1.40 1.40 0 7 C -1.4 1.40 -1.4 1.40 -7 0 C -1.4 -1.4 -1.4 -1.4 0 -7 Z"
            fill="var(--star, #ffd98a)"
          />
        </svg>
        <h2 className="coop-notice__title">あなたの分を書きました</h2>
        <p className="coop-notice__body">{body}</p>
        <button type="button" className="coop-notice__cta" onClick={onClose}>
          {cta}
        </button>
      </div>
    </div>
  )
}
