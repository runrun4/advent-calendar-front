import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react'
import { createPortal } from 'react-dom'
import { Modal } from '../../components/common/Modal'
import { ApiError } from '../../services/apiClient'
import {
  createEvent,
  type EventNameCandidate,
  type EventSummary,
  searchEventCandidates,
} from '../../services/eventApi'
import {
  DEFAULT_EVENT_ICON_ID,
  EventNameField,
  type EventIconId,
} from './EventNameField'
import { PrivateEventDetailPage } from './PrivateEventDetailPage'
import { PublicEventRequestPage } from './PublicEventRequestPage'
import './EventAddModal.css'

type EventType = 'public' | 'private'
type DateSpanMode = 'single' | 'multi'
type DateField = 'start' | 'end'

type EventAddModalProps = {
  isOpen: boolean
  onClose: () => void
  initialStartDate?: string | null
  onCreated?: (event: EventSummary) => void
}

const MIN_COUNTDOWN_DAYS = 0
const MAX_COUNTDOWN_DAYS = 29
/** 何pxドラッグしたら1日分動くか */
const COUNTDOWN_DRAG_STEP_PX = 26
const WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日'] as const

function toDateValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateValue(value: string): Date | null {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function startOfLocalDate(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function todayValue(): string {
  return toDateValue(startOfLocalDate())
}

function daysFromToday(value: string): number | null {
  const date = parseDateValue(value)
  if (!date) return null
  const today = startOfLocalDate()
  return Math.round(
    (date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  )
}

function maxCountdownForStart(startDate: string): number {
  const days = daysFromToday(startDate)
  if (days == null) return MAX_COUNTDOWN_DAYS
  if (days < MIN_COUNTDOWN_DAYS) return MIN_COUNTDOWN_DAYS
  return Math.min(MAX_COUNTDOWN_DAYS, days)
}

function clampCountdownDays(
  value: number,
  maxDays = MAX_COUNTDOWN_DAYS,
): number {
  return Math.min(maxDays, Math.max(MIN_COUNTDOWN_DAYS, value))
}

function normalizeStartDate(value: string | null | undefined): string {
  if (!value) return ''
  const minStart = todayValue()
  return value < minStart ? minStart : value
}

function formatDateDisplay(value: string): string {
  if (!value) return '----/--/--'
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return '----/--/--'
  return `${year}/${month}/${day}`
}

type InlineCalendarProps = {
  selected: string
  initialViewDate?: string
  minDate?: string
  onSelect: (value: string) => void
}

function InlineCalendar({
  selected,
  initialViewDate,
  minDate,
  onSelect,
}: InlineCalendarProps) {
  const initial =
    parseDateValue(selected) ??
    parseDateValue(initialViewDate ?? '') ??
    new Date()
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())

  useEffect(() => {
    const next = parseDateValue(selected)
    if (!next) return
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }, [selected])

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((year) => year - 1)
      setViewMonth(11)
      return
    }
    setViewMonth((month) => month - 1)
  }

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((year) => year + 1)
      setViewMonth(0)
      return
    }
    setViewMonth((month) => month + 1)
  }

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const mondayOffset = (firstWeekday + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: Array<number | null> = Array.from(
    { length: mondayOffset },
    () => null,
  )

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day)
  }

  while (cells.length % 7 !== 0) {
    cells.push(null)
  }

  return (
    <div className="event-add-modal__calendar">
      <div className="event-add-modal__calendar-header">
        <span className="event-add-modal__calendar-month">
          {viewYear}年{viewMonth + 1}月
          <span aria-hidden="true"> ›</span>
        </span>

        <div className="event-add-modal__calendar-nav">
          <button
            type="button"
            className="event-add-modal__calendar-nav-button"
            onClick={goPrevMonth}
            aria-label="前の月"
          >
            ‹
          </button>
          <button
            type="button"
            className="event-add-modal__calendar-nav-button"
            onClick={goNextMonth}
            aria-label="次の月"
          >
            ›
          </button>
        </div>
      </div>

      <div className="event-add-modal__calendar-weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="event-add-modal__calendar-grid">
        {cells.map((day, index) => {
          if (day == null) {
            return (
              <span
                key={`empty-${index}`}
                className="event-add-modal__calendar-cell event-add-modal__calendar-cell--empty"
              />
            )
          }

          const value = toDateValue(
            new Date(viewYear, viewMonth, day),
          )
          const isSelected = value === selected
          const isDisabled =
            minDate != null && value < minDate

          return (
            <button
              key={value}
              type="button"
              className={`event-add-modal__calendar-cell${
                isSelected
                  ? ' event-add-modal__calendar-cell--selected'
                  : ''
              }`}
              disabled={isDisabled}
              onClick={() => onSelect(value)}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

type DateSectionProps = {
  mode: DateSpanMode
  onModeChange: (mode: DateSpanMode) => void
  startDate: string
  endDate: string
  minStartDate: string
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
}

function DateSection({
  mode,
  onModeChange,
  startDate,
  endDate,
  minStartDate,
  onStartDateChange,
  onEndDateChange,
}: DateSectionProps) {
  const [activeField, setActiveField] =
    useState<DateField | null>(null)

  const toggleField = (field: DateField) => {
    setActiveField((current) =>
      current === field ? null : field,
    )
  }

  const handleModeChange = (nextMode: DateSpanMode) => {
    onModeChange(nextMode)
    if (nextMode === 'single' && activeField === 'end') {
      setActiveField(null)
    }
  }

  return (
    <div className="event-add-modal__date-section">
      <div className="event-add-modal__date-header">
        <span className="event-add-modal__date-heading">
          日付
        </span>

        <div
          className="event-add-modal__date-toggle"
          role="group"
          aria-label="日付の種類"
        >
          <button
            type="button"
            className={`event-add-modal__date-toggle-option${
              mode === 'single'
                ? ' event-add-modal__date-toggle-option--selected'
                : ''
            }`}
            aria-pressed={mode === 'single'}
            onClick={() => handleModeChange('single')}
          >
            一日
          </button>
          <button
            type="button"
            className={`event-add-modal__date-toggle-option${
              mode === 'multi'
                ? ' event-add-modal__date-toggle-option--selected'
                : ''
            }`}
            aria-pressed={mode === 'multi'}
            onClick={() => handleModeChange('multi')}
          >
            複数日
          </button>
        </div>
      </div>

      <div className="event-add-modal__date-row">
        <span className="event-add-modal__date-row-label">
          開始
        </span>
        <button
          type="button"
          className={`event-add-modal__date-pill${
            activeField === 'start'
              ? ' event-add-modal__date-pill--active'
              : ''
          }`}
          aria-expanded={activeField === 'start'}
          aria-label="開始日"
          onClick={() => toggleField('start')}
        >
          <span className="event-add-modal__date-pill-text">
            {formatDateDisplay(startDate)}
          </span>
        </button>
      </div>

      {activeField === 'start' ? (
        <InlineCalendar
          selected={startDate}
          minDate={minStartDate}
          onSelect={(value) => {
            onStartDateChange(value)
            if (
              mode === 'multi' &&
              endDate &&
              endDate < value
            ) {
              onEndDateChange('')
            }
          }}
        />
      ) : null}

      {mode === 'multi' ? (
        <>
          <div className="event-add-modal__date-row">
            <span className="event-add-modal__date-row-label">
              終了
            </span>
            <button
              type="button"
              className={`event-add-modal__date-pill${
                activeField === 'end'
                  ? ' event-add-modal__date-pill--active'
                  : ''
              }`}
              aria-expanded={activeField === 'end'}
              aria-label="終了日"
              onClick={() => toggleField('end')}
            >
              <span className="event-add-modal__date-pill-text">
                {formatDateDisplay(endDate)}
              </span>
            </button>
          </div>

          {activeField === 'end' ? (
            <InlineCalendar
              selected={endDate}
              initialViewDate={startDate}
              minDate={startDate || undefined}
              onSelect={onEndDateChange}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}

export function EventAddModal({
  isOpen,
  onClose,
  initialStartDate = null,
  onCreated,
}: EventAddModalProps) {
  const [eventType, setEventType] =
    useState<EventType>('public')

  /*
   * パブリックイベント検索後の画面を
   * 表示するかどうか
   */
  const [showPublicRequest, setShowPublicRequest] =
    useState(false)
  const [publicCandidates, setPublicCandidates] = useState<
    EventNameCandidate[]
  >([])
  const [publicSearchPerformed, setPublicSearchPerformed] =
    useState(false)
  const [isSearchingPublic, setIsSearchingPublic] = useState(false)
  const [publicSearchError, setPublicSearchError] = useState<
    string | null
  >(null)
  const [selectedCandidate, setSelectedCandidate] =
    useState<EventNameCandidate | null>(null)
  const publicSearchAbortRef = useRef<AbortController | null>(null)

  const [showPrivateDetail, setShowPrivateDetail] =
    useState(false)

  // ========================================
  // パブリックイベント
  // ========================================

  const [publicEventName, setPublicEventName] =
    useState('')

  const [publicEventIconId, setPublicEventIconId] =
    useState<EventIconId>(DEFAULT_EVENT_ICON_ID)

  const [publicDateMode, setPublicDateMode] =
    useState<DateSpanMode>('single')

  const [publicEventStartDate, setPublicEventStartDate] =
    useState('')

  const [publicEventEndDate, setPublicEventEndDate] =
    useState('')

  const [publicEventLocation, setPublicEventLocation] =
    useState('')

  const [publicCountdownDays, setPublicCountdownDays] =
    useState(15)

  // ========================================
  // プライベートイベント
  // ========================================

  const [privateEventName, setPrivateEventName] =
    useState('')

  const [privateEventIconId, setPrivateEventIconId] =
    useState<EventIconId>(DEFAULT_EVENT_ICON_ID)

  const [privateDateMode, setPrivateDateMode] =
    useState<DateSpanMode>('single')

  const [privateEventStartDate, setPrivateEventStartDate] =
    useState('')

  const [privateEventEndDate, setPrivateEventEndDate] =
    useState('')

  const [privateEventLocation, setPrivateEventLocation] =
    useState('')

  const [privateCountdownDays, setPrivateCountdownDays] =
    useState(15)

  const [showDiscardConfirm, setShowDiscardConfirm] =
    useState(false)
  const [isWaitingCreate, setIsWaitingCreate] = useState(false)

  const minStartDate = todayValue()
  const defaultStartDate = normalizeStartDate(initialStartDate)
  const defaultCountdownDays = clampCountdownDays(
    15,
    maxCountdownForStart(defaultStartDate),
  )

  const isDirty =
    eventType !== 'public' ||
    showPublicRequest ||
    showPrivateDetail ||
    publicEventName.trim() !== '' ||
    privateEventName.trim() !== '' ||
    publicEventIconId !== DEFAULT_EVENT_ICON_ID ||
    publicDateMode !== 'single' ||
    publicEventStartDate !== defaultStartDate ||
    publicEventEndDate !== '' ||
    publicEventLocation !== '' ||
    publicCountdownDays !== defaultCountdownDays ||
    privateEventIconId !== DEFAULT_EVENT_ICON_ID ||
    privateDateMode !== 'single' ||
    privateEventStartDate !== defaultStartDate ||
    privateEventEndDate !== '' ||
    privateEventLocation !== '' ||
    privateCountdownDays !== defaultCountdownDays

  const resetForm = () => {
    publicSearchAbortRef.current?.abort()
    publicSearchAbortRef.current = null
    setEventType('public')
    setShowPublicRequest(false)
    setPublicCandidates([])
    setPublicSearchPerformed(false)
    setIsSearchingPublic(false)
    setPublicSearchError(null)
    setSelectedCandidate(null)
    setShowPrivateDetail(false)
    setPublicEventName('')
    setPublicEventIconId(DEFAULT_EVENT_ICON_ID)
    setPublicDateMode('single')
    setPublicEventStartDate(defaultStartDate)
    setPublicEventEndDate('')
    setPublicEventLocation('')
    setPublicCountdownDays(defaultCountdownDays)
    setPrivateEventName('')
    setPrivateEventIconId(DEFAULT_EVENT_ICON_ID)
    setPrivateDateMode('single')
    setPrivateEventStartDate(defaultStartDate)
    setPrivateEventEndDate('')
    setPrivateEventLocation('')
    setPrivateCountdownDays(defaultCountdownDays)
    setShowDiscardConfirm(false)
    setIsWaitingCreate(false)
  }

  useEffect(() => {
    if (!isOpen) return

    publicSearchAbortRef.current?.abort()
    publicSearchAbortRef.current = null
    setEventType('public')
    setShowPublicRequest(false)
    setPublicCandidates([])
    setPublicSearchPerformed(false)
    setIsSearchingPublic(false)
    setPublicSearchError(null)
    setSelectedCandidate(null)
    setShowPrivateDetail(false)
    setPublicEventName('')
    setPublicEventIconId(DEFAULT_EVENT_ICON_ID)
    setPublicDateMode('single')
    setPublicEventStartDate(defaultStartDate)
    setPublicEventEndDate('')
    setPublicEventLocation('')
    setPublicCountdownDays(defaultCountdownDays)
    setPrivateEventName('')
    setPrivateEventIconId(DEFAULT_EVENT_ICON_ID)
    setPrivateDateMode('single')
    setPrivateEventStartDate(defaultStartDate)
    setPrivateEventEndDate('')
    setPrivateEventLocation('')
    setPrivateCountdownDays(defaultCountdownDays)
    setShowDiscardConfirm(false)
    setIsWaitingCreate(false)
  }, [isOpen, defaultStartDate])

  useEffect(() => {
    publicSearchAbortRef.current?.abort()
    publicSearchAbortRef.current = null
    setPublicCandidates([])
    setPublicSearchPerformed(false)
    setPublicSearchError(null)
    setSelectedCandidate(null)
    setIsSearchingPublic(false)
  }, [
    publicEventName,
    publicEventLocation,
    publicEventStartDate,
    publicEventEndDate,
    publicDateMode,
  ])

  const resolvePublicEndDate = () =>
    publicDateMode === 'single'
      ? publicEventStartDate
      : publicEventEndDate

  const canSearchPublic =
    publicEventName.trim() !== '' &&
    publicEventLocation.trim() !== '' &&
    publicEventStartDate !== '' &&
    publicEventStartDate >= minStartDate &&
    (publicDateMode === 'single' || publicEventEndDate !== '')

  const handlePublicSearch = async () => {
    if (!canSearchPublic || isSearchingPublic || isWaitingCreate) return

    const endDate = resolvePublicEndDate()
    publicSearchAbortRef.current?.abort()
    const controller = new AbortController()
    publicSearchAbortRef.current = controller

    setIsSearchingPublic(true)
    setPublicSearchError(null)
    setPublicCandidates([])
    setPublicSearchPerformed(false)
    setSelectedCandidate(null)

    try {
      const candidates = await searchEventCandidates(
        {
          name: publicEventName,
          startDate: publicEventStartDate,
          endDate,
          location: publicEventLocation,
        },
        controller.signal,
      )
      if (controller.signal.aborted) return
      setPublicCandidates(candidates)
      setPublicSearchPerformed(true)
    } catch (error) {
      if (controller.signal.aborted) return
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : '検索に失敗しました'
      setPublicSearchError(message)
      setPublicSearchPerformed(false)
    } finally {
      if (!controller.signal.aborted) {
        setIsSearchingPublic(false)
      }
    }
  }

  const handleCreateFromCandidate = async () => {
    if (!selectedCandidate || isWaitingCreate) return

    const eventTitle = publicEventName.trim()
    if (!eventTitle) return

    setIsWaitingCreate(true)
    setPublicSearchError(null)

    try {
      const created = await createEvent({
        // イベントタイトルはユーザー入力名。候補名は確認表示用のみ。
        name: eventTitle,
        startDate: publicEventStartDate,
        endDate: resolvePublicEndDate(),
        countdownDays: publicCountdownDays,
        mode: 'GROUP',
        category: publicEventLocation,
        iconId: publicEventIconId,
      })
      resetForm()
      onClose()
      onCreated?.(created)
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'イベントの作成に失敗しました'
      setPublicSearchError(message)
      setIsWaitingCreate(false)
    }
  }

  const requestClose = () => {
    if (isWaitingCreate) return
    if (isDirty) {
      setShowDiscardConfirm(true)
      return
    }
    resetForm()
    onClose()
  }

  const confirmDiscard = () => {
    resetForm()
    onClose()
  }

  // ========================================
  // カウントダウンのスワイプ
  // ========================================

  const countdownDragOriginX = useRef<number | null>(null)
  const countdownDragOriginValue = useRef(0)
  const currentCountdownDaysRef = useRef(15)

  const currentCountdownDays =
    eventType === 'public'
      ? publicCountdownDays
      : privateCountdownDays

  const currentStartDate =
    eventType === 'public'
      ? publicEventStartDate
      : privateEventStartDate
  const maxCountdownDays = maxCountdownForStart(currentStartDate)

  currentCountdownDaysRef.current = currentCountdownDays

  useEffect(() => {
    const maxPublic = maxCountdownForStart(publicEventStartDate)
    setPublicCountdownDays((days) => clampCountdownDays(days, maxPublic))
  }, [publicEventStartDate])

  useEffect(() => {
    const maxPrivate = maxCountdownForStart(privateEventStartDate)
    setPrivateCountdownDays((days) => clampCountdownDays(days, maxPrivate))
  }, [privateEventStartDate])

  const setCurrentCountdownDays = (value: number) => {
    const next = clampCountdownDays(value, maxCountdownDays)
    if (eventType === 'public') {
      setPublicCountdownDays(next)
    } else {
      setPrivateCountdownDays(next)
    }
  }

  const handleCountdownPointerDown = (
    event: PointerEvent<HTMLDivElement>,
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    countdownDragOriginX.current = event.clientX
    countdownDragOriginValue.current =
      currentCountdownDaysRef.current
  }

  const handleCountdownPointerMove = (
    event: PointerEvent<HTMLDivElement>,
  ) => {
    if (countdownDragOriginX.current === null) {
      return
    }

    const deltaX =
      event.clientX - countdownDragOriginX.current
    const steps = Math.round(
      deltaX / COUNTDOWN_DRAG_STEP_PX,
    )
    // 右へドラッグ → 日数を減らす / 左へ → 増やす
    const next = clampCountdownDays(
      countdownDragOriginValue.current - steps,
      maxCountdownDays,
    )

    if (next !== currentCountdownDaysRef.current) {
      setCurrentCountdownDays(next)
    }
  }

  const endCountdownDrag = (
    event: PointerEvent<HTMLDivElement>,
  ) => {
    if (countdownDragOriginX.current === null) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    countdownDragOriginX.current = null
  }

  const handleCountdownWheel = (
    event: WheelEvent<HTMLDivElement>,
  ) => {
    event.preventDefault()
    const delta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY

    if (Math.abs(delta) < 2) {
      return
    }

    setCurrentCountdownDays(
      currentCountdownDaysRef.current +
        (delta > 0 ? 1 : -1),
    )
  }

  // ========================================
  // スマホキーボードの決定キー
  // ========================================

  const handleInputKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur()
    }
  }

  // ========================================
  // カウントダウン表示用の日数
  // ========================================

  const countdownNumbers = []

  for (
    let day = currentCountdownDays - 3;
    day <= currentCountdownDays + 3;
    day += 1
  ) {
    if (
      day >= MIN_COUNTDOWN_DAYS &&
      day <= maxCountdownDays
    ) {
      countdownNumbers.push(day)
    }
  }

  const renderCountdownItem = (day: number) => {
    const distance = Math.abs(day - currentCountdownDays)
    const sideClass =
      day < currentCountdownDays
        ? 'is-left'
        : day > currentCountdownDays
          ? 'is-right'
          : ''

    return (
      <div
        key={day}
        className={[
          'event-add-modal__countdown-item',
          `event-add-modal__countdown-item--distance-${Math.min(distance, 3)}`,
          sideClass,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {day}
      </div>
    )
  }

  // ========================================
  // 表示
  // ========================================

  return (
    <>
      <Modal
        isOpen={isOpen}
        title="イベント追加"
        onClose={requestClose}
        variant="sheet"
        disableSwipeClose={isDirty || isWaitingCreate}
      >
        <div className="event-add-modal">

        {/* ========================================
            パブリックイベント検索後の画面
            ======================================== */}

        {showPublicRequest ? (
          <PublicEventRequestPage
            eventName={publicEventName}
            startDate={publicEventStartDate}
            endDate={resolvePublicEndDate()}
            countdownDays={publicCountdownDays}
            location={publicEventLocation}
            iconId={publicEventIconId}
            onBusyChange={setIsWaitingCreate}
            onCreated={(event) => {
              resetForm()
              onClose()
              onCreated?.(event)
            }}
          />
        ) : showPrivateDetail ? (
          <PrivateEventDetailPage
            eventName={privateEventName}
            startDate={privateEventStartDate}
            endDate={
              privateDateMode === 'single'
                ? privateEventStartDate
                : privateEventEndDate
            }
            countdownDays={privateCountdownDays}
            category={privateEventLocation}
            iconId={privateEventIconId}
            onBusyChange={setIsWaitingCreate}
            onCreated={(event) => {
              resetForm()
              onClose()
              onCreated?.(event)
            }}
          />
        ) : (
          <>
            {/* ========================================
                イベント種類選択
                ======================================== */}

            <div className="event-add-modal__type-selector">
              <button
                type="button"
                className={`event-add-modal__type-button ${
                  eventType === 'public'
                    ? 'event-add-modal__type-button--selected'
                    : ''
                }`}
                onClick={() => setEventType('public')}
              >
                パブリックイベント
              </button>

              <button
                type="button"
                className={`event-add-modal__type-button ${
                  eventType === 'private'
                    ? 'event-add-modal__type-button--selected'
                    : ''
                }`}
                onClick={() => setEventType('private')}
              >
                プライベート
              </button>
            </div>

            {/* ========================================
                アンケート
                ======================================== */}

            <div className="event-add-modal__content">

              {/* ========================================
                  パブリックイベント
                  ======================================== */}

              {eventType === 'public' ? (
                <div className="event-add-modal__questionnaire">

                  {/* イベント名 */}
                  <div className="event-add-modal__question">
                    <EventNameField
                      id="public-event-name"
                      value={publicEventName}
                      onChange={setPublicEventName}
                      iconId={publicEventIconId}
                      onIconChange={setPublicEventIconId}
                      onKeyDown={handleInputKeyDown}
                    />
                  </div>

                  {/* 日付 */}
                  <div className="event-add-modal__question">
                    <DateSection
                      mode={publicDateMode}
                      onModeChange={(nextMode) => {
                        setPublicDateMode(nextMode)
                        if (nextMode === 'single') {
                          setPublicEventEndDate('')
                        }
                      }}
                      startDate={publicEventStartDate}
                      endDate={publicEventEndDate}
                      minStartDate={minStartDate}
                      onStartDateChange={
                        setPublicEventStartDate
                      }
                      onEndDateChange={
                        setPublicEventEndDate
                      }
                    />
                  </div>

                  {/* 場所 */}
                  <div className="event-add-modal__question">
                    <label
                      htmlFor="public-event-location"
                      className="event-add-modal__label"
                    >
                      場所
                    </label>

                    <input
                      id="public-event-location"
                      type="text"
                      className="event-add-modal__input"
                      value={publicEventLocation}
                      onChange={(e) =>
                        setPublicEventLocation(
                          e.target.value,
                        )
                      }
                      onKeyDown={handleInputKeyDown}
                      placeholder="会場名などを入力"
                      inputMode="text"
                      enterKeyHint="done"
                    />
                  </div>

                  {/* カウントダウン */}
                  <div className="event-add-modal__question">
                    <p className="event-add-modal__countdown-label">
                      ＞何日前からカウントダウン
                      <br />
                      &nbsp;&nbsp;を開始しますか？
                    </p>

                    <div
                      className="event-add-modal__countdown-picker"
                      onPointerDown={
                        handleCountdownPointerDown
                      }
                      onPointerMove={
                        handleCountdownPointerMove
                      }
                      onPointerUp={endCountdownDrag}
                      onPointerCancel={endCountdownDrag}
                      onWheel={handleCountdownWheel}
                    >
                      <div className="event-add-modal__countdown-list">
                        {countdownNumbers.map(
                          renderCountdownItem,
                        )}
                      </div>
                    </div>

                    <span className="event-add-modal__unit">
                      日前
                    </span>
                  </div>

                  {publicSearchPerformed ? (
                    <div className="event-add-modal__candidates">
                      <p className="event-add-modal__candidates-label">
                        検索結果
                      </p>

                      {publicCandidates.map((candidate, index) => (
                        <button
                          key={`${candidate.name}-${index}`}
                          type="button"
                          className="event-add-modal__candidate-button"
                          disabled={isWaitingCreate}
                          onClick={() => {
                            setPublicSearchError(null)
                            setSelectedCandidate(candidate)
                          }}
                        >
                          {candidate.name}
                        </button>
                      ))}

                      <button
                        type="button"
                        className="event-add-modal__candidate-miss"
                        disabled={isWaitingCreate}
                        onClick={() => setShowPublicRequest(true)}
                      >
                        この中にない
                      </button>
                    </div>
                  ) : null}

                  {isSearchingPublic ? (
                    <div
                      className="event-add-modal__search-loading"
                      role="status"
                      aria-label="検索中"
                    >
                      {[0, 1, 2].map((index) => (
                        <span
                          key={index}
                          className="event-add-modal__search-loading-dot"
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                  ) : null}

                  {/* 検索する */}
                  <button
                    type="button"
                    className="event-add-modal__submit-button"
                    disabled={
                      !canSearchPublic ||
                      isSearchingPublic ||
                      isWaitingCreate
                    }
                    onClick={() => void handlePublicSearch()}
                  >
                    {isSearchingPublic ? '検索中…' : '検索する'}
                  </button>

                  {publicSearchError ? (
                    <p
                      className="event-add-modal__search-error"
                      role="alert"
                    >
                      {publicSearchError}
                    </p>
                  ) : null}

                </div>
              ) : (

                /* ========================================
                   プライベートイベント
                   ======================================== */

                <div className="event-add-modal__questionnaire">

                  {/* イベント名 */}
                  <div className="event-add-modal__question">
                    <EventNameField
                      id="private-event-name"
                      value={privateEventName}
                      onChange={setPrivateEventName}
                      iconId={privateEventIconId}
                      onIconChange={setPrivateEventIconId}
                      onKeyDown={handleInputKeyDown}
                    />
                  </div>

                  {/* 日付 */}
                  <div className="event-add-modal__question">
                    <DateSection
                      mode={privateDateMode}
                      onModeChange={(nextMode) => {
                        setPrivateDateMode(nextMode)
                        if (nextMode === 'single') {
                          setPrivateEventEndDate('')
                        }
                      }}
                      startDate={privateEventStartDate}
                      endDate={privateEventEndDate}
                      minStartDate={minStartDate}
                      onStartDateChange={
                        setPrivateEventStartDate
                      }
                      onEndDateChange={
                        setPrivateEventEndDate
                      }
                    />
                  </div>

                  {/* 場所 */}
                  <div className="event-add-modal__question">
                    <label
                      htmlFor="private-event-location"
                      className="event-add-modal__label"
                    >
                      場所
                    </label>

                    <input
                      id="private-event-location"
                      type="text"
                      className="event-add-modal__input event-add-modal__input--hint"
                      value={privateEventLocation}
                      onChange={(e) =>
                        setPrivateEventLocation(
                          e.target.value,
                        )
                      }
                      onKeyDown={handleInputKeyDown}
                      placeholder="大阪府、兵庫県、京都府など"
                      inputMode="text"
                      enterKeyHint="done"
                    />
                  </div>

                  {/* カウントダウン */}
                  <div className="event-add-modal__question">
                    <p className="event-add-modal__countdown-label">
                      ＞何日前からカウントダウン
                      <br />
                      &nbsp;&nbsp;を開始しますか？
                    </p>

                    <div
                      className="event-add-modal__countdown-picker"
                      onPointerDown={
                        handleCountdownPointerDown
                      }
                      onPointerMove={
                        handleCountdownPointerMove
                      }
                      onPointerUp={endCountdownDrag}
                      onPointerCancel={endCountdownDrag}
                      onWheel={handleCountdownWheel}
                    >
                      <div className="event-add-modal__countdown-list">
                        {countdownNumbers.map(
                          renderCountdownItem,
                        )}
                      </div>
                    </div>

                    <span className="event-add-modal__unit">
                      日前
                    </span>
                  </div>

                  {/* 次に進む */}
                  <button
                    type="button"
                    className="event-add-modal__submit-button"
                    disabled={
                      !privateEventName.trim() ||
                      !privateEventStartDate ||
                      privateEventStartDate < minStartDate ||
                      (privateDateMode === 'multi' &&
                        !privateEventEndDate) ||
                      !privateEventLocation
                    }
                    onClick={() => setShowPrivateDetail(true)}
                  >
                    次に進む
                  </button>

                </div>
              )}
            </div>
          </>
        )}
      </div>
      </Modal>

      {selectedCandidate && isOpen
        ? createPortal(
            <div
              className="event-add-modal__confirm-backdrop"
              role="presentation"
              onClick={() => {
                if (!isWaitingCreate) setSelectedCandidate(null)
              }}
            >
              <div
                className="event-add-modal__confirm"
                role="dialog"
                aria-modal="true"
                aria-labelledby="event-add-candidate-title"
                onClick={(event) => event.stopPropagation()}
              >
                {isWaitingCreate ? (
                  <>
                    <div
                      className="event-add-modal__confirm-spinner"
                      aria-hidden="true"
                    />
                    <p className="event-add-modal__confirm-message">
                      アドベントカレンダーを作成しています
                    </p>
                  </>
                ) : (
                  <>
                    <p
                      id="event-add-candidate-title"
                      className="event-add-modal__confirm-title"
                    >
                      {selectedCandidate.name}
                    </p>
                    {publicSearchError ? (
                      <p
                        className="event-add-modal__search-error"
                        role="alert"
                      >
                        {publicSearchError}
                      </p>
                    ) : null}
                    <div className="event-add-modal__confirm-actions">
                      <button
                        type="button"
                        className="event-add-modal__confirm-button event-add-modal__confirm-button--cancel"
                        onClick={() => {
                          setSelectedCandidate(null)
                          setPublicSearchError(null)
                        }}
                      >
                        キャンセル
                      </button>
                      <button
                        type="button"
                        className="event-add-modal__confirm-button event-add-modal__confirm-button--create"
                        onClick={() => void handleCreateFromCandidate()}
                      >
                        カレンダーを
                        <br />
                        作成する
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}

      {showDiscardConfirm
        ? createPortal(
            <div
              className="event-add-modal__confirm-backdrop"
              role="presentation"
              onClick={() => setShowDiscardConfirm(false)}
            >
              <div
                className="event-add-modal__confirm"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="event-add-discard-title"
                onClick={(event) => event.stopPropagation()}
              >
                <p
                  id="event-add-discard-title"
                  className="event-add-modal__confirm-message"
                >
                  変更内容が破棄されます
                  <br />
                  大丈夫ですか？
                </p>
                <div className="event-add-modal__confirm-actions">
                  <button
                    type="button"
                    className="event-add-modal__confirm-button event-add-modal__confirm-button--cancel"
                    onClick={() => setShowDiscardConfirm(false)}
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    className="event-add-modal__confirm-button event-add-modal__confirm-button--discard"
                    onClick={confirmDiscard}
                  >
                    破棄する
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
