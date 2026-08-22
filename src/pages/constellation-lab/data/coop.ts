// ==========================================
// 協力デイ (day 10): 参加者全員が書き込むまで星が鎖で縛られている日
// design/ConstellationCalendar.dc.html の COOP_DAYS まわりが正
// ==========================================

/** 鎖で縛られている日 (現状は10日目のみ) */
export const COOP_DAYS: readonly number[] = [10]

/** 参加メンバー (先頭が自分)。6人固定のモックデータ */
export const MEMBERS: readonly string[] = ['あなた', 'みなと', 'ひなた', 'そら', 'つむぎ', 'りく']
export const MEMBER_TOTAL = MEMBERS.length

/** 鎖の弧の半径 (開封済み前提のスケール1でのベース値) */
export const CHAIN_R = 74

/** 解放演出の時間割 (releaseCoop 開始からの経過ms) */
export const REL_SHATTER = 420
export const REL_SHARD_IN = 1080
export const REL_IGNITE = 900
export const REL_CARD = 1320
export const REL_END = 1400

/** 鎖の長押し(メンバー一覧を開く)のしきい値 */
export const LONG_PRESS_MS = 420

const RAD = Math.PI / 180

/** 中心が原点の弧の path (r=半径, a0/a1=角度[deg]) */
export const arcPath = (r: number, a0Deg: number, a1Deg: number): string => {
  const a0 = a0Deg * RAD
  const a1 = a1Deg * RAD
  const x0 = r * Math.cos(a0)
  const y0 = r * Math.sin(a0)
  const x1 = r * Math.cos(a1)
  const y1 = r * Math.sin(a1)
  return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`
}

export const isCoopDay = (day: number): boolean => COOP_DAYS.includes(day)
