// ==========================================
// DebugPanel: プロト検証用パネル
// 開封日数 / 協力デイの他メンバー人数の変更と、主要な状態へのジャンプを担う
// ==========================================
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import './DebugPanel.css'

type DebugPanelProps = {
  openedCount: number
  totalDays: number
  /** 星座レイアウトが扱える最大日数 */
  maxDays: number
  /** 星座シード。空ならデザインの正 (手作り30点) */
  seed: string
  othersWritten: number
  onChangeSeed: (seed: string) => void
  onChangeTotalDays: (days: number) => void
  onChangeOpenedCount: (count: number) => void
  onChangeOthersWritten: (count: number) => void
  onJumpToCoopEve: () => void
  onJumpToCoop: () => void
  onJumpToFinaleReady: () => void
  onPlayFinale: () => void
  onReset: () => void
}

export const DebugPanel = ({
  openedCount,
  totalDays,
  maxDays,
  seed,
  othersWritten,
  onChangeSeed,
  onChangeTotalDays,
  onChangeOpenedCount,
  onChangeOthersWritten,
  onJumpToCoopEve,
  onJumpToCoop,
  onJumpToFinaleReady,
  onPlayFinale,
  onReset,
}: DebugPanelProps) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="debug-panel">
      <button type="button" className="debug-panel__toggle" onClick={() => setIsOpen((v) => !v)}>
        <span>Debug</span>
        {isOpen ? <ChevronDown size={14} strokeWidth={2} /> : <ChevronUp size={14} strokeWidth={2} />}
      </button>

      {isOpen && (
        <div className="debug-panel__body">
          <label className="debug-panel__row">
            <span>星座シード{seed.trim() ? '' : ' (空 = デザインの正)'}</span>
            <input
              type="text"
              className="debug-panel__text"
              value={seed}
              placeholder="event-id など"
              onChange={(e) => onChangeSeed(e.target.value)}
            />
          </label>

          <label className="debug-panel__row">
            <span>日数: {totalDays}</span>
            <input
              type="range"
              min={1}
              max={maxDays}
              value={totalDays}
              onChange={(e) => onChangeTotalDays(Number(e.target.value))}
            />
          </label>

          <label className="debug-panel__row">
            <span>開封日数: {openedCount}</span>
            <input
              type="range"
              min={0}
              max={totalDays}
              value={openedCount}
              onChange={(e) => onChangeOpenedCount(Number(e.target.value))}
            />
          </label>

          <label className="debug-panel__row">
            <span>協力デイ 他メンバー: {othersWritten} / 5</span>
            <input
              type="range"
              min={0}
              max={5}
              value={othersWritten}
              onChange={(e) => onChangeOthersWritten(Number(e.target.value))}
            />
          </label>

          <div className="debug-panel__actions">
            <button type="button" onClick={onJumpToCoopEve}>
              協力デイ直前
            </button>
            <button type="button" onClick={onJumpToCoop}>
              協力デイへ
            </button>
            <button type="button" onClick={onJumpToFinaleReady}>
              最終日の1つ前まで
            </button>
            <button type="button" onClick={onPlayFinale}>
              フィナーレ再生
            </button>
            <button type="button" onClick={onReset}>
              リセット
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
