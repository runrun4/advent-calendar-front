// ==========================================
// ConstellationCalendar: 画面本体
// ヘッダー・星座ズームビュー・進捗・開封フロー・協力デイ・フィナーレを統括する
// design/ConstellationCalendar.dc.html の Component クラスが正
// ==========================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, Gift, MessageCircle, Settings } from 'lucide-react'
import {
  CONSTELLATION_CENTROID,
  FINALE_K,
  FINALE_T_END,
  FINALE_T_ZOOM,
  GLIDE_MS,
  K_IDLE,
  STARS,
  TOTAL_DAYS,
  dayStateOf,
} from '../data/constellationLayout'
import { COOP_DAYS, LONG_PRESS_MS, MEMBER_TOTAL } from '../data/coop'
import { INITIAL_OPENED_COUNT, MOCK_CONTENTS } from '../data/mockDays'
import { useBurstCanvas } from '../hooks/useBurstCanvas'
import { useCamera } from '../hooks/useCamera'
import type { CameraState } from '../hooks/useCamera'
import { useCoopDay } from '../hooks/useCoopDay'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useTimers } from '../hooks/useTimers'
import type { Phase } from '../types/constellation'
import { clamp, clamp01, easeOutCubic, lerp } from '../utils/easing'
import { AmbientBackground } from './AmbientBackground'
import { CoopHud, CoopMemberPanel, CoopNoticeCard, CoopReleaseButton } from './CoopDay'
import { DayContentCard } from './DayContentCard'
import { DebugPanel } from './DebugPanel'
import { StarField } from './StarField'
import { buildScene } from './starFieldScene'
import './ConstellationCalendar.css'

type ConstellationCalendarProps = {
  title: string
  onBack: () => void
}

const FALLBACK_STAR_COLOR = '#ffd98a'

export const ConstellationCalendar = ({ title, onBack }: ConstellationCalendarProps) => {
  const [openedCount, setOpenedCount] = useState(INITIAL_OPENED_COUNT)
  const [focusDay, setFocusDay] = useState(Math.min(INITIAL_OPENED_COUNT + 1, TOTAL_DAYS))
  const [phase, setPhase] = useState<Phase>('daily')
  const [cardDay, setCardDay] = useState<number | null>(null)
  const [justOpenedDay, setJustOpenedDay] = useState<number | null>(null)
  const [finaleT, setFinaleT] = useState(0)

  const maxAccessibleDay = Math.min(openedCount + 1, TOTAL_DAYS)

  const reducedMotion = useReducedMotion()
  const { later, clearAll: clearAllTimers } = useTimers()
  const finaleRafRef = useRef<number | null>(null)

  // setTimeout 経由 (later) で発火する処理は、closure に閉じ込めた古い phase ではなく
  // 常に最新の phase を見る必要があるため ref で参照する
  const phaseRef = useRef<Phase>(phase)
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  // オブジェクトのまま持つと lint (react-hooks/refs) が burst() 呼び出しまで ref アクセス扱いにするため分割代入する
  const {
    canvasRef: burstCanvasRef,
    burst: playBurst,
    stop: stopBurst,
  } = useBurstCanvas({ starColor: FALLBACK_STAR_COLOR, effectLevel: 'balanced', reducedMotion })

  /*
   * ==========================================
   * 協力デイ (day 10)
   * ==========================================
   */

  const onIgnite = useCallback(() => {
    setJustOpenedDay(COOP_DAYS[0])
    playBurst()
    later(() => setJustOpenedDay(null), 900)
  }, [playBurst, later])

  const onReleaseCardReady = useCallback((day: number) => {
    setPhase('card')
    setCardDay(day)
  }, [])

  const coop = useCoopDay({ later, burst: playBurst, onIgnite, onReleaseCardReady })

  const advanceOpened = useCallback((day: number) => {
    setOpenedCount((current) => Math.max(current, day))
  }, [])

  /*
   * ==========================================
   * 開封フロー
   * ==========================================
   */

  // 760ms後の setTimeout から呼ばれるため、phase は必ず ref 経由の最新値で判定する
  // (openDay 実行時点の closure に閉じ込めた phase は 'daily' のまま古くなってしまう)
  const finishOpening = useCallback(() => {
    if (phaseRef.current !== 'opening') return
    setPhase('card')
    setCardDay(focusDay)
  }, [focusDay])

  const openDay = useCallback(
    (day: number) => {
      if (phase !== 'daily') return // 多重タップ防止 (IMPLEMENTATION_NOTES §1-7)
      setPhase('opening')
      setOpenedCount(day)
      setJustOpenedDay(day)
      later(() => setJustOpenedDay(null), 900)
      playBurst()
      later(() => finishOpening(), 760)
    },
    [phase, later, playBurst, finishOpening]
  )

  const handleTap = useCallback(() => {
    const day = focusDay
    if (coop.isChained(day)) {
      if (coop.coopT > 0) return // 解放演出中
      if (!coop.myWritten) coop.writeMyPart(day, advanceOpened)
      else if (!coop.allWritten) coop.openPanel()
      return // 解放は専用ボタンから
    }
    const state = dayStateOf(day, openedCount)
    if (state === 'openable') openDay(day)
    else if (state === 'opened') {
      setCardDay(day)
      setPhase('card')
    }
  }, [focusDay, coop, advanceOpened, openedCount, openDay])

  /*
   * ==========================================
   * カメラ + スワイプ
   * ==========================================
   */

  const handleCommit = useCallback(
    (direction: 1 | -1) => {
      setFocusDay((day) => clamp(day + direction, 1, maxAccessibleDay))
    },
    [maxAccessibleDay]
  )

  const camera = useCamera({
    focusDay,
    maxAccessibleDay,
    // 協力デイの確認カード/メンバー一覧が表示中は、そのオーバーレイの操作を
    // star-field-wrap 側のタップ/スワイプとして拾わないようにする (防御的な二重ガード)
    active: phase === 'daily' && !coop.notice && !coop.coopPanel,
    isLongPressTarget: coop.isChained(focusDay) && coop.coopT === 0,
    longPressMs: LONG_PRESS_MS,
    onLongPress: coop.openPanel,
    onTap: handleTap,
    onCommit: handleCommit,
  })

  // camera.glide(...) とメソッド呼び出しにすると camera 全体が依存に要求されるため関数を取り出す
  const glideCamera = camera.glide
  const closeCard = useCallback(() => {
    const day = cardDay
    setPhase('daily')
    setCardDay(null)
    // 開封後は次の星へ自前でカメラを送る
    if (day !== null && day === openedCount && day < TOTAL_DAYS) {
      glideCamera(GLIDE_MS)
    }
  }, [cardDay, openedCount, glideCamera])

  /*
   * ==========================================
   * フィナーレ (30日目リビール)
   * ==========================================
   */

  const startFinale = useCallback(() => {
    camera.cancelAll()
    if (finaleRafRef.current !== null) {
      cancelAnimationFrame(finaleRafRef.current)
      finaleRafRef.current = null
    }
    setPhase('finale')
    setCardDay(null)
    setFocusDay(TOTAL_DAYS)
    setFinaleT(0)

    const start = performance.now()
    const step = (now: number) => {
      const t = now - start
      setFinaleT(t)
      // 単一の rAF が進行度の唯一のソース (IMPLEMENTATION_NOTES §1-3 / §6)
      if (t < FINALE_T_END) {
        finaleRafRef.current = requestAnimationFrame(step)
      } else {
        finaleRafRef.current = null
        setFinaleT(FINALE_T_END)
      }
    }
    finaleRafRef.current = requestAnimationFrame(step)

    later(() => {
      if (finaleRafRef.current !== null) {
        cancelAnimationFrame(finaleRafRef.current)
        finaleRafRef.current = null
        setFinaleT(FINALE_T_END)
      }
    }, FINALE_T_END + 500)
  }, [camera, later])

  const onExitFinale = useCallback(() => {
    if (finaleRafRef.current !== null) {
      cancelAnimationFrame(finaleRafRef.current)
      finaleRafRef.current = null
    }
    setPhase('daily')
    setFinaleT(0)
    setFocusDay(TOTAL_DAYS)
  }, [])

  useEffect(() => {
    return () => {
      if (finaleRafRef.current !== null) cancelAnimationFrame(finaleRafRef.current)
    }
  }, [])

  // タブが非表示になったら開封演出/協力デイの解放演出を即完了させる (IMPLEMENTATION_NOTES §1-9)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) finishOpening()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [finishOpening])

  /*
   * ==========================================
   * デバッグ操作
   * ==========================================
   */

  const applyOpened = useCallback(
    (count: number) => {
      camera.cancelAll()
      if (finaleRafRef.current !== null) {
        cancelAnimationFrame(finaleRafRef.current)
        finaleRafRef.current = null
      }
      stopBurst()
      coop.stopAll()
      clearAllTimers()

      const c = burstCanvasRef.current
      if (c) {
        const ctx = c.getContext('2d')
        ctx?.clearRect(0, 0, c.width, c.height)
      }

      setPhase('daily')
      setCardDay(null)
      setJustOpenedDay(null)
      setFinaleT(0)
      setOpenedCount(count)
      setFocusDay(Math.min(count + 1, TOTAL_DAYS))

      const coopDay = COOP_DAYS[0]
      coop.resetForDebug({
        myWritten: count >= coopDay,
        othersWritten: count >= coopDay ? MEMBER_TOTAL - 1 : 3,
        coopUnlocked: count > coopDay,
      })
    },
    [camera, stopBurst, burstCanvasRef, coop, clearAllTimers]
  )

  const onDebugRange = useCallback((count: number) => applyOpened(clamp(count, 0, TOTAL_DAYS)), [applyOpened])
  const onJumpCoop = useCallback(() => applyOpened(COOP_DAYS[0] - 1), [applyOpened])
  const onJumpCoopEve = useCallback(() => {
    applyOpened(COOP_DAYS[0] - 1)
    setFocusDay(COOP_DAYS[0] - 1)
  }, [applyOpened])
  const onJump29 = useCallback(() => applyOpened(TOTAL_DAYS - 1), [applyOpened])
  const onJumpFinale = useCallback(() => {
    applyOpened(TOTAL_DAYS)
    later(startFinale, 30)
  }, [applyOpened, later, startFinale])
  const onReset = useCallback(() => applyOpened(INITIAL_OPENED_COUNT), [applyOpened])

  /*
   * ==========================================
   * カメラ・シーンの決定
   * ==========================================
   */

  const effectiveCamera: CameraState = useMemo(() => {
    if (phase === 'finale') {
      const focusStar = STARS[focusDay - 1]
      const ez = easeOutCubic(clamp01(finaleT / FINALE_T_ZOOM))
      return {
        cx: lerp(focusStar[0], CONSTELLATION_CENTROID[0], ez),
        cy: lerp(focusStar[1], CONSTELLATION_CENTROID[1], ez),
        k: lerp(K_IDLE, FINALE_K, ez),
      }
    }
    return camera.camera
  }, [phase, focusDay, finaleT, camera.camera])

  const scene = useMemo(
    () =>
      buildScene({
        opened: openedCount,
        maxAccessibleDay,
        focusDay,
        tp: camera.tp,
        travelTargetDay: camera.travelTargetDay,
        camera: effectiveCamera,
        phase,
        finaleT,
        justOpenedDay,
        isChained: coop.isChained,
        coopT: coop.coopT,
        myWritten: coop.myWritten,
        writtenCount: coop.writtenCount,
      }),
    [
      openedCount,
      maxAccessibleDay,
      focusDay,
      camera.tp,
      camera.travelTargetDay,
      effectiveCamera,
      phase,
      finaleT,
      justOpenedDay,
      coop.isChained,
      coop.coopT,
      coop.myWritten,
      coop.writtenCount,
    ]
  )

  const cardContent = cardDay !== null ? MOCK_CONTENTS[cardDay - 1] : null
  const chromeOpacity = phase === 'finale' && finaleT > 600 ? 0.35 : 1
  const showCoopHud = coop.isChained(focusDay) && !scene.traveling
  const coopRemain = MEMBER_TOTAL - coop.writtenCount
  const showReleaseButton = showCoopHud && coopRemain <= 0 && coop.coopT === 0
  const progressPct = `${((openedCount / TOTAL_DAYS) * 100).toFixed(1)}%`

  return (
    <div className="constellation-calendar">
      <AmbientBackground showShooters={!reducedMotion} />

      {/* =========================
          左上：戻るボタン
          ========================= */}

      <button
        type="button"
        className="constellation-calendar__icon-button constellation-calendar__back-button"
        onClick={onBack}
        aria-label="戻る"
      >
        <ChevronLeft size={26} strokeWidth={2} />
      </button>

      {/* =========================
          右上：設定・チャット
          ========================= */}

      <div className="constellation-calendar__top-buttons">
        <button type="button" className="constellation-calendar__icon-button" aria-label="設定">
          <Settings size={22} strokeWidth={2} />
        </button>
        <button type="button" className="constellation-calendar__icon-button" aria-label="チャット">
          <MessageCircle size={22} strokeWidth={2} />
        </button>
      </div>

      {/* =========================
          イベント情報
          ========================= */}

      <div className="constellation-calendar__event-info" style={{ opacity: chromeOpacity }}>
        <p className="constellation-calendar__event-date">8/30</p>
        <h1 className="constellation-calendar__event-title">{title}</h1>
      </div>

      {scene.bannerVisible && (
        <div className="constellation-calendar__finale-banner">
          <span className="constellation-calendar__finale-banner-title">星座が完成</span>
          <span className="constellation-calendar__finale-banner-sub">{TOTAL_DAYS} / {TOTAL_DAYS} opened</span>
        </div>
      )}

      {/* =========================
          星座ズームビュー
          ========================= */}

      <div
        className="constellation-calendar__star-field-wrap"
        onPointerDown={camera.onPointerDown}
        onPointerMove={camera.onPointerMove}
        onPointerUp={camera.onPointerUp}
        onPointerCancel={camera.onPointerUp}
      >
        <StarField scene={scene} camera={effectiveCamera} />

        {showCoopHud && <CoopHud writtenCount={coop.writtenCount} coopT={coop.coopT} myWritten={coop.myWritten} />}
        {showReleaseButton && <CoopReleaseButton onRelease={coop.releaseCoop} />}
        {coop.coopPanel && (
          <CoopMemberPanel
            writtenCount={coop.writtenCount}
            myWritten={coop.myWritten}
            othersWritten={coop.othersWritten}
            onClose={coop.closePanel}
          />
        )}
        {coop.notice && <CoopNoticeCard remain={coopRemain} onClose={coop.closeNotice} />}

        <canvas ref={burstCanvasRef} className="constellation-calendar__burst-canvas" />
      </div>

      {/* 進捗 */}
      <div className="constellation-calendar__progress" style={{ opacity: chromeOpacity }}>
        <div className="constellation-calendar__progress-track">
          <div className="constellation-calendar__progress-fill" style={{ width: progressPct }} />
        </div>
        <span className="constellation-calendar__progress-label">
          {openedCount} / {TOTAL_DAYS} opened
        </span>
      </div>

      {/* =========================
          右下：ギフト(ダミー)
          ========================= */}

      <button
        type="button"
        className="constellation-calendar__icon-button constellation-calendar__gift-button"
        aria-label="獲得アイテム一覧"
      >
        <Gift size={22} strokeWidth={2} />
      </button>

      {scene.finaleExitVisible && (
        <button type="button" className="constellation-calendar__finale-exit" onClick={onExitFinale}>
          星空にもどる
        </button>
      )}

      {/* =========================
          開封内容カード
          ========================= */}

      {phase === 'card' && cardDay !== null && cardContent && (
        <DayContentCard
          day={cardDay}
          content={cardContent}
          isFinaleDay={cardDay === TOTAL_DAYS}
          onClose={closeCard}
          onReveal={startFinale}
        />
      )}

      {/* =========================
          DebugPanel (プロト用)
          ========================= */}

      <DebugPanel
        openedCount={openedCount}
        totalDays={TOTAL_DAYS}
        othersWritten={coop.othersWritten}
        onChangeOpenedCount={onDebugRange}
        onChangeOthersWritten={coop.setOthersWritten}
        onJumpToCoopEve={onJumpCoopEve}
        onJumpToCoop={onJumpCoop}
        onJumpToFinaleReady={onJump29}
        onPlayFinale={onJumpFinale}
        onReset={onReset}
      />
    </div>
  )
}
