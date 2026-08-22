// ==========================================
// 協力デイ (day 10) の状態管理
// 参加者6人全員が書き込むまで星が鎖で縛られている。
// design/ConstellationCalendar.dc.html の writeMyPart / releaseCoop が正
// ==========================================
import { useCallback, useEffect, useRef, useState } from 'react'
import { COOP_DAYS, MEMBER_TOTAL, REL_CARD, REL_END, REL_IGNITE } from '../data/coop'

type UseCoopDayParams = {
  later: (fn: () => void, ms: number) => number
  /** 自分の分を書いた直後の小さめのバースト */
  burst: (strength?: number) => void
  /** 鎖が解放され星が点灯する瞬間 (呼び出し側で justOpened ポップ + 通常バーストを行う) */
  onIgnite: () => void
  /** 解放演出の終盤、カードを表示してよいタイミング */
  onReleaseCardReady: (day: number) => void
}

export type UseCoopDayReturn = {
  myWritten: boolean
  othersWritten: number
  coopUnlocked: boolean
  coopPanel: boolean
  notice: boolean
  coopT: number
  writtenCount: number
  allWritten: boolean
  isChained: (day: number) => boolean
  writeMyPart: (day: number, onAdvanceOpened: (day: number) => void) => void
  releaseCoop: () => void
  closeNotice: () => void
  openPanel: () => void
  closePanel: () => void
  setOthersWritten: (count: number) => void
  resetForDebug: (opts: { myWritten: boolean; othersWritten: number; coopUnlocked: boolean }) => void
  stopAll: () => void
}

const clampMembers = (n: number) => Math.min(Math.max(n, 0), MEMBER_TOTAL - 1)

export const useCoopDay = ({ later, burst, onIgnite, onReleaseCardReady }: UseCoopDayParams): UseCoopDayReturn => {
  const [myWritten, setMyWritten] = useState(false)
  const [othersWritten, setOthersWrittenState] = useState(3)
  const [coopUnlocked, setCoopUnlocked] = useState(false)
  const [coopPanel, setCoopPanel] = useState(false)
  const [notice, setNotice] = useState(false)
  const [coopT, setCoopT] = useState(0)

  const rafRef = useRef<number | null>(null)
  const unlockedRef = useRef(false)
  const cardTriggeredRef = useRef(false)

  const stopAll = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  useEffect(() => stopAll, [stopAll])

  const writtenCount = othersWritten + (myWritten ? 1 : 0)
  const allWritten = writtenCount >= MEMBER_TOTAL

  const isChained = useCallback((day: number) => COOP_DAYS.includes(day) && !coopUnlocked, [coopUnlocked])

  const writeMyPart = useCallback(
    (day: number, onAdvanceOpened: (day: number) => void) => {
      if (myWritten) return
      setMyWritten(true)
      setNotice(true)
      onAdvanceOpened(day)
      burst(0.45)
    },
    [burst, myWritten]
  )

  const closeNotice = useCallback(() => setNotice(false), [])
  const openPanel = useCallback(() => setCoopPanel(true), [])
  const closePanel = useCallback(() => setCoopPanel(false), [])
  const setOthersWritten = useCallback((count: number) => setOthersWrittenState(clampMembers(count)), [])

  const releaseCoop = useCallback(() => {
    if (coopT > 0) return
    setCoopPanel(false)
    unlockedRef.current = false
    cardTriggeredRef.current = false

    const start = performance.now()
    const step = (now: number) => {
      const t = now - start
      setCoopT(t)

      if (t >= REL_IGNITE && !unlockedRef.current) {
        unlockedRef.current = true
        setCoopUnlocked(true)
        onIgnite()
      }
      if (t >= REL_CARD && !cardTriggeredRef.current) {
        cardTriggeredRef.current = true
        onReleaseCardReady(COOP_DAYS[0])
      }

      if (t < REL_END) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        rafRef.current = null
        setCoopT(REL_END)
      }
    }
    rafRef.current = requestAnimationFrame(step)

    // rAF が止まる環境 (タブ非表示など) でも解放演出が終端状態へ収束するようにする。
    // ignite 済み (unlockedRef) だけを見ると、ignite 後〜カード表示の間で rAF が止まった場合に
    // 保険が即 return してカードが二度と出ない。cardTriggeredRef 基準にして
    // 「カード未表示ならまだ救済が必要」と判定する。
    later(() => {
      if (cardTriggeredRef.current) return
      stopAll()
      setCoopT(REL_END)
      if (!unlockedRef.current) {
        unlockedRef.current = true
        setCoopUnlocked(true)
      }
      cardTriggeredRef.current = true
      onReleaseCardReady(COOP_DAYS[0])
    }, REL_END + 500)
  }, [coopT, later, onIgnite, onReleaseCardReady, stopAll])

  const resetForDebug = useCallback(
    (opts: { myWritten: boolean; othersWritten: number; coopUnlocked: boolean }) => {
      stopAll()
      unlockedRef.current = opts.coopUnlocked
      cardTriggeredRef.current = false
      setMyWritten(opts.myWritten)
      setOthersWrittenState(clampMembers(opts.othersWritten))
      setCoopUnlocked(opts.coopUnlocked)
      setCoopPanel(false)
      setNotice(false)
      setCoopT(0)
    },
    [stopAll]
  )

  return {
    myWritten,
    othersWritten,
    coopUnlocked,
    coopPanel,
    notice,
    coopT,
    writtenCount,
    allWritten,
    isChained,
    writeMyPart,
    releaseCoop,
    closeNotice,
    openPanel,
    closePanel,
    setOthersWritten,
    resetForDebug,
    stopAll,
  }
}
