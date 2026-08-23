// ==========================================
// ConstellationCalendar: 画面本体
// ヘッダー・星座ズームビュー・進捗・開封フロー・協力デイ・フィナーレを統括する
// design/ConstellationCalendar.dc.html の Component クラスが正
// ==========================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, Gift, MessageCircle, Settings } from 'lucide-react'
import { formatMonthDay } from '../../../utils/dateUtils'
import {
  getEventCalendar,
  getOpenedDay,
  listEventMembers,
  openEventDay,
  type CalendarDaySummary,
} from '../../../services/eventApi'
import {
  FINALE_T_END,
  FINALE_T_ZOOM,
  GLIDE_MS,
  K_IDLE,
  MAX_DAYS,
  sliceDefaultLayout,
  starAt,
} from '../data/constellationLayout'
import { createConstellationLayout } from '../data/constellationGenerator'
import { COOP_DAYS, LONG_PRESS_MS, MEMBER_TOTAL } from '../data/coop'
import {
  buildDayStatesFromCalendar,
  buildDayStatesFromOpenedCount,
  coopDaysFromCalendar,
  countOpened,
  dayContentFromApi,
  dayIdByPosition,
  focusDayFromStates,
  hydrateCoopFromCalendar,
  markDayOpened,
  maxAccessibleDayOf,
  resolveTotalDays,
} from '../data/calendarBridge'
import { INITIAL_OPENED_COUNT, MOCK_CONTENTS } from '../data/mockDays'
import { useBurstCanvas } from '../hooks/useBurstCanvas'
import { useCamera } from '../hooks/useCamera'
import type { CameraState } from '../hooks/useCamera'
import { useCoopDay } from '../hooks/useCoopDay'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useTimers } from '../hooks/useTimers'
import type { DayContent, DayState, Phase } from '../types/constellation'
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
  eventDate?: string
  /** 渡すと GET /calendar・開封 API に接続する（本体イベント画面） */
  eventId?: string
  onBack: () => void
  onOpenStickers?: () => void
  onOpenSettings?: () => void
  onOpenChat?: () => void
  /** 検証用 DebugPanel。本体では false */
  showDebug?: boolean
}

const FALLBACK_STAR_COLOR = '#ffd98a'

export const ConstellationCalendar = ({
  title,
  eventDate,
  eventId,
  onBack,
  onOpenStickers,
  onOpenSettings,
  onOpenChat,
  showDebug = true,
}: ConstellationCalendarProps) => {
  const [dayStates, setDayStates] = useState<Record<number, DayState>>(() =>
    buildDayStatesFromOpenedCount(INITIAL_OPENED_COUNT, MAX_DAYS),
  )
  const [totalDays, setTotalDays] = useState(MAX_DAYS)
  const [focusDay, setFocusDay] = useState(
    focusDayFromStates(
      buildDayStatesFromOpenedCount(INITIAL_OPENED_COUNT, MAX_DAYS),
      MAX_DAYS,
    ),
  )
  const [phase, setPhase] = useState<Phase>('daily')
  const [cardDay, setCardDay] = useState<number | null>(null)
  const [justOpenedDay, setJustOpenedDay] = useState<number | null>(null)
  const [finaleT, setFinaleT] = useState(0)
  const [calendarDays, setCalendarDays] = useState<CalendarDaySummary[]>([])
  const [coopDayNumbers, setCoopDayNumbers] = useState<readonly number[]>(COOP_DAYS)
  const [coopMemberTotal, setCoopMemberTotal] = useState(MEMBER_TOTAL)
  const [memberNames, setMemberNames] = useState<readonly string[] | undefined>(undefined)
  const [dayContents, setDayContents] = useState<Record<number, DayContent>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isOpeningRemote, setIsOpeningRemote] = useState(false)
  // 検証ページの Debug から任意のシードを試すための入力 (空ならデザインの正)
  const [debugSeed, setDebugSeed] = useState('')

  const openedCount = useMemo(() => countOpened(dayStates), [dayStates])
  const maxAccessibleDay = useMemo(
    () => maxAccessibleDayOf(dayStates, totalDays),
    [dayStates, totalDays],
  )
  const getDayState = useCallback(
    (day: number) => dayStates[day] ?? 'locked',
    [dayStates],
  )

  /*
   * ==========================================
   * 星座レイアウト
   * イベント ID (検証ページでは Debug のシード) をシードに、日数ぶんの星を
   * 決定的に生成する。どちらも無いときは手作り30点 = デザインの正を使う。
   * ========================================== */

  const layoutSeed = eventId ?? (debugSeed.trim() || null)
  const layout = useMemo(
    () =>
      layoutSeed
        ? createConstellationLayout({ seed: layoutSeed, dayCount: totalDays })
        : sliceDefaultLayout(totalDays),
    [layoutSeed, totalDays],
  )

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
    setJustOpenedDay(coopDayNumbers[0] ?? COOP_DAYS[0])
    playBurst()
    later(() => setJustOpenedDay(null), 900)
  }, [playBurst, later, coopDayNumbers])

  const onReleaseCardReady = useCallback((day: number) => {
    setPhase('card')
    setCardDay(day)
  }, [])

  const coop = useCoopDay({
    later,
    burst: playBurst,
    onIgnite,
    onReleaseCardReady,
    coopDays: coopDayNumbers,
    memberTotal: coopMemberTotal,
  })

  const advanceOpened = useCallback((day: number) => {
    setDayStates((current) => markDayOpened(current, day))
  }, [])

  /*
   * ==========================================
   * 本体イベント: カレンダー取得
   * ==========================================
   */

  useEffect(() => {
    if (!eventId) return

    const controller = new AbortController()

    const load = async () => {
      setLoadError(null)
      try {
        const [calendar, members] = await Promise.all([
          getEventCalendar(eventId, controller.signal),
          listEventMembers(eventId, controller.signal).catch(() => null),
        ])
        if (controller.signal.aborted) return

        setCalendarDays(calendar.days)
        const nextTotal = resolveTotalDays(calendar.days, calendar.event)
        setTotalDays(nextTotal)

        const states = buildDayStatesFromCalendar(calendar.days, nextTotal)
        setDayStates(states)
        setFocusDay(focusDayFromStates(states, nextTotal))

        const coopPositions = coopDaysFromCalendar(calendar.days)
        if (coopPositions.length > 0) {
          setCoopDayNumbers(coopPositions)
        }

        const hydrated = hydrateCoopFromCalendar(calendar)
        if (hydrated) {
          setCoopMemberTotal(hydrated.memberTotal)
          coop.resetForDebug({
            myWritten: hydrated.myWritten,
            othersWritten: hydrated.othersWritten,
            // ACHIEVED 済みなら鎖は解く。未達成のうちは明示解放まで鎖を維持
            coopUnlocked: hydrated.coopUnlocked,
          })
        }

        if (members?.members?.length) {
          const names = members.members.map((member) => member.user.displayName)
          setMemberNames(names)
          setCoopMemberTotal((current) =>
            Math.max(current, members.members.length),
          )
        }
      } catch (error) {
        if (controller.signal.aborted) return
        const message =
          error instanceof Error ? error.message : 'カレンダーの取得に失敗しました'
        setLoadError(message)
      }
    }

    void load()
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

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

  const playOpenAnimation = useCallback(
    (day: number) => {
      setPhase('opening')
      setDayStates((current) => markDayOpened(current, day))
      setJustOpenedDay(day)
      later(() => setJustOpenedDay(null), 900)
      playBurst()
      later(() => finishOpening(), 760)
    },
    [later, playBurst, finishOpening],
  )

  const openDay = useCallback(
    (day: number) => {
      if (phase !== 'daily' || isOpeningRemote) return

      if (!eventId) {
        playOpenAnimation(day)
        return
      }

      const dayId = dayIdByPosition(calendarDays, day)
      if (!dayId) {
        setLoadError('開封対象のデイが見つかりません')
        return
      }

      setIsOpeningRemote(true)
      void openEventDay(eventId, dayId)
        .then((response) => {
          setDayContents((current) => ({
            ...current,
            [day]: dayContentFromApi(response.content),
          }))
          playOpenAnimation(day)
        })
        .catch((error) => {
          const message =
            error instanceof Error ? error.message : '開封に失敗しました'
          setLoadError(message)
        })
        .finally(() => setIsOpeningRemote(false))
    },
    [phase, isOpeningRemote, eventId, calendarDays, playOpenAnimation],
  )

  const writeCoopPart = useCallback(
    (day: number) => {
      if (coop.myWritten || isOpeningRemote) return

      if (!eventId) {
        coop.writeMyPart(day, advanceOpened)
        return
      }

      const dayId = dayIdByPosition(calendarDays, day)
      if (!dayId) {
        setLoadError('開封対象のデイが見つかりません')
        return
      }

      setIsOpeningRemote(true)
      void openEventDay(eventId, dayId)
        .then((response) => {
          const progress = response.cooperation?.progress
          if (progress) {
            setCoopMemberTotal(progress.requiredCount)
            coop.resetForDebug({
              myWritten: true,
              othersWritten: Math.max(0, progress.openedCount - 1),
              coopUnlocked: false,
            })
          } else {
            coop.writeMyPart(day, advanceOpened)
          }
          advanceOpened(day)
          setDayContents((current) => ({
            ...current,
            [day]: dayContentFromApi(response.content),
          }))
        })
        .catch((error) => {
          const message =
            error instanceof Error ? error.message : '書き込みに失敗しました'
          setLoadError(message)
        })
        .finally(() => setIsOpeningRemote(false))
    },
    [
      coop,
      isOpeningRemote,
      eventId,
      calendarDays,
      advanceOpened,
    ],
  )

  const openCardForDay = useCallback(
    (day: number) => {
      setCardDay(day)
      setPhase('card')

      if (!eventId || dayContents[day]) return
      const dayId = dayIdByPosition(calendarDays, day)
      if (!dayId) return

      void getOpenedDay(eventId, dayId)
        .then((response) => {
          setDayContents((current) => ({
            ...current,
            [day]: dayContentFromApi(response.content),
          }))
        })
        .catch(() => {
          // モック内容にフォールバック
        })
    },
    [eventId, dayContents, calendarDays],
  )

  const handleTap = useCallback(() => {
    const day = focusDay
    if (coop.isChained(day)) {
      if (coop.coopT > 0) return
      if (!coop.myWritten) writeCoopPart(day)
      else if (!coop.allWritten) coop.openPanel()
      return
    }
    const state = getDayState(day)
    if (state === 'openable') openDay(day)
    else if (state === 'opened') openCardForDay(day)
  }, [focusDay, coop, getDayState, openDay, writeCoopPart, openCardForDay])

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
    layout,
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
    // 開封後、次が openable ならそちらへカメラを送る
    if (
      day !== null &&
      getDayState(day) === 'opened' &&
      day < totalDays &&
      getDayState(day + 1) === 'openable'
    ) {
      glideCamera(GLIDE_MS)
    }
  }, [cardDay, getDayState, totalDays, glideCamera])

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
    setFocusDay(totalDays)
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
  }, [camera, later, totalDays])

  const onExitFinale = useCallback(() => {
    if (finaleRafRef.current !== null) {
      cancelAnimationFrame(finaleRafRef.current)
      finaleRafRef.current = null
    }
    setPhase('daily')
    setFinaleT(0)
    setFocusDay(totalDays)
  }, [totalDays])

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

  const applyOpenedIn = useCallback(
    (count: number, days: number) => {
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
      const states = buildDayStatesFromOpenedCount(clamp(count, 0, days), days)
      setDayStates(states)
      setFocusDay(focusDayFromStates(states, days))

      const coopDay = coopDayNumbers[0] ?? COOP_DAYS[0]
      coop.resetForDebug({
        myWritten: count >= coopDay,
        othersWritten: count >= coopDay ? Math.max(coopMemberTotal - 1, 0) : 3,
        coopUnlocked: count > coopDay,
      })
    },
    [
      camera,
      stopBurst,
      burstCanvasRef,
      coop,
      clearAllTimers,
      coopDayNumbers,
      coopMemberTotal,
    ],
  )

  const applyOpened = useCallback(
    (count: number) => applyOpenedIn(count, totalDays),
    [applyOpenedIn, totalDays],
  )

  /** Debug: 日数を変えたら状態マップも作り直す (協力デイが範囲外に出ても落ちない) */
  const onDebugDayCount = useCallback(
    (value: number) => {
      const next = clamp(Math.round(value), 1, MAX_DAYS)
      setTotalDays(next)
      applyOpenedIn(Math.min(openedCount, next), next)
    },
    [applyOpenedIn, openedCount],
  )

  const onDebugRange = useCallback(
    (count: number) => applyOpened(clamp(count, 0, totalDays)),
    [applyOpened, totalDays],
  )
  const onJumpCoop = useCallback(
    () => applyOpened((coopDayNumbers[0] ?? COOP_DAYS[0]) - 1),
    [applyOpened, coopDayNumbers],
  )
  const onJumpCoopEve = useCallback(() => {
    const coopDay = coopDayNumbers[0] ?? COOP_DAYS[0]
    applyOpened(coopDay - 1)
    setFocusDay(coopDay - 1)
  }, [applyOpened, coopDayNumbers])
  const onJump29 = useCallback(() => applyOpened(totalDays - 1), [applyOpened, totalDays])
  const onJumpFinale = useCallback(() => {
    applyOpened(totalDays)
    later(startFinale, 30)
  }, [applyOpened, later, startFinale, totalDays])
  const onReset = useCallback(() => applyOpened(INITIAL_OPENED_COUNT), [applyOpened])

  /*
   * ==========================================
   * カメラ・シーンの決定
   * ==========================================
   */

  const effectiveCamera: CameraState = useMemo(() => {
    if (phase === 'finale') {
      const focusStar = starAt(layout, focusDay)
      const ez = easeOutCubic(clamp01(finaleT / FINALE_T_ZOOM))
      return {
        cx: lerp(focusStar[0], layout.centroid[0], ez),
        cy: lerp(focusStar[1], layout.centroid[1], ez),
        k: lerp(K_IDLE, layout.finaleK, ez),
      }
    }
    return camera.camera
  }, [phase, focusDay, finaleT, camera.camera, layout])

  const scene = useMemo(
    () =>
      buildScene({
        layout,
        getDayState,
        totalDays,
        memberTotal: coop.memberTotal,
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
      layout,
      getDayState,
      totalDays,
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
      coop.memberTotal,
    ],
  )

  const cardContent =
    cardDay !== null
      ? (dayContents[cardDay] ?? MOCK_CONTENTS[cardDay - 1] ?? null)
      : null
  const chromeOpacity = phase === 'finale' && finaleT > 600 ? 0.35 : 1
  const showCoopHud = coop.isChained(focusDay) && !scene.traveling
  const coopRemain = coop.memberTotal - coop.writtenCount
  const showReleaseButton = showCoopHud && coopRemain <= 0 && coop.coopT === 0
  const progressPct = `${((openedCount / totalDays) * 100).toFixed(1)}%`

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
        <button
          type="button"
          className="constellation-calendar__icon-button"
          aria-label="設定"
          onClick={onOpenSettings}
        >
          <Settings size={22} strokeWidth={2} />
        </button>
        <button
          type="button"
          className="constellation-calendar__icon-button"
          aria-label="チャット"
          onClick={onOpenChat}
        >
          <MessageCircle size={22} strokeWidth={2} />
        </button>
      </div>

      {/* =========================
          イベント情報
          ========================= */}

      <div className="constellation-calendar__event-info" style={{ opacity: chromeOpacity }}>
        <p className="constellation-calendar__event-date">
          {eventDate ? formatMonthDay(eventDate) : '8/30'}
        </p>
        <h1 className="constellation-calendar__event-title">{title}</h1>
      </div>

      {loadError ? (
        <p className="constellation-calendar__load-error" role="alert">
          {loadError}
        </p>
      ) : null}

      {scene.bannerVisible && (
        <div className="constellation-calendar__finale-banner">
          <span className="constellation-calendar__finale-banner-title">星座が完成</span>
          <span className="constellation-calendar__finale-banner-sub">{openedCount} / {totalDays} opened</span>
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
        <StarField scene={scene} camera={effectiveCamera} centroid={layout.centroid} />

        {showCoopHud && (
          <CoopHud
            writtenCount={coop.writtenCount}
            coopT={coop.coopT}
            myWritten={coop.myWritten}
            memberTotal={coop.memberTotal}
          />
        )}
        {showReleaseButton && <CoopReleaseButton onRelease={coop.releaseCoop} />}
        {coop.coopPanel && (
          <CoopMemberPanel
            writtenCount={coop.writtenCount}
            myWritten={coop.myWritten}
            othersWritten={coop.othersWritten}
            memberTotal={coop.memberTotal}
            memberNames={memberNames}
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
          {openedCount} / {totalDays} opened
        </span>
      </div>

      {/* =========================
          右下：ギフト(ダミー)
          ========================= */}

      <button
        type="button"
        className="constellation-calendar__icon-button constellation-calendar__gift-button"
        aria-label="獲得アイテム一覧"
        onClick={onOpenStickers}
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
          isFinaleDay={cardDay === totalDays}
          onClose={closeCard}
          onReveal={startFinale}
        />
      )}

      {/* =========================
          DebugPanel (プロト用)
          ========================= */}

      {showDebug ? (
        <DebugPanel
          openedCount={openedCount}
          totalDays={totalDays}
          maxDays={MAX_DAYS}
          seed={debugSeed}
          othersWritten={coop.othersWritten}
          onChangeSeed={setDebugSeed}
          onChangeTotalDays={onDebugDayCount}
          onChangeOpenedCount={onDebugRange}
          onChangeOthersWritten={coop.setOthersWritten}
          onJumpToCoopEve={onJumpCoopEve}
          onJumpToCoop={onJumpCoop}
          onJumpToFinaleReady={onJump29}
          onPlayFinale={onJumpFinale}
          onReset={onReset}
        />
      ) : null}
    </div>
  )
}
