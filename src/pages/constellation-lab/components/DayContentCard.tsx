// ==========================================
// DayContentCard: 開封済みの内容カード
// 30日目のみ「全体公開」ボタンを出し、フィナーレへの導線になる
// ==========================================
import { Gift, X } from 'lucide-react'
import { sparklePath } from '../data/constellationLayout'
import type { DayContent } from '../types/constellation'
import './DayContentCard.css'

type DayContentCardProps = {
  day: number
  content: DayContent
  isFinaleDay: boolean
  onClose: () => void
  onReveal: () => void
}

export const DayContentCard = ({ day, content, isFinaleDay, onClose, onReveal }: DayContentCardProps) => {
  return (
    <div className="day-content-card__overlay" onClick={onClose}>
      <div className="day-content-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="day-content-card__close"
          onClick={onClose}
          aria-label="とじる"
        >
          <X size={20} strokeWidth={2} />
        </button>

        <p className="day-content-card__label">DAY {day}</p>

        {content.imageUrl ? (
          <div className="day-content-card__sticker">
            <img
              src={content.imageUrl}
              alt=""
              className="day-content-card__sticker-image"
              draggable={false}
            />
            {content.rarity === 'DELUXE' ? (
              <span className="day-content-card__sticker-rarity">DELUXE</span>
            ) : null}
          </div>
        ) : (
          <svg className="day-content-card__icon" width="52" height="52" viewBox="-14 -14 28 28">
            <circle r="12" fill="var(--star, #ffd98a)" fillOpacity="0.12" className="day-content-card__icon-halo" />
            <path d={sparklePath(9)} fill="var(--star, #ffd98a)" />
            <circle r="1.6" fill="#ffffff" />
          </svg>
        )}

        <h2 className="day-content-card__title">{day}日目のおくりもの</h2>

        <p className="day-content-card__message">{content.message}</p>

        <div className="day-content-card__item">
          <Gift size={16} strokeWidth={2} />
          <span>{content.itemName}</span>
        </div>

        {isFinaleDay ? (
          <button type="button" className="day-content-card__cta" onClick={onReveal}>
            夜空に浮かべる
          </button>
        ) : (
          <button type="button" className="day-content-card__cta" onClick={onClose}>
            とじる
          </button>
        )}
      </div>
    </div>
  )
}
