import {
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type TransitionEvent,
} from 'react'

type ModalVariant = 'dark' | 'light' | 'sheet'

type ModalProps = {
  isOpen: boolean
  title?: string
  onClose: () => void
  children: ReactNode
  variant?: ModalVariant
  /** true のときシートの下スワイプで閉じない */
  disableSwipeClose?: boolean
}

const SHEET_EXIT_MS = 280
const DRAG_CLOSE_THRESHOLD = 100
const CLOSE_FALLBACK_MS = 100

function getBackdropClassName(
  variant: ModalVariant,
  isClosing: boolean,
) {
  const classes = ['modal-backdrop']

  if (variant === 'sheet') {
    classes.push('modal-backdrop--sheet')
  }

  if (isClosing) {
    classes.push('is-closing')
  }

  return classes.join(' ')
}

function getPanelClassName(
  variant: ModalVariant,
  isClosing: boolean,
  isDragging: boolean,
) {
  const classes = ['modal-panel']

  if (variant === 'sheet') {
    classes.push('modal-panel--sheet')
  }

  if (variant === 'light') {
    classes.push('modal-panel--light')
  }

  if (isClosing) {
    classes.push('is-closing')
  }

  if (isDragging) {
    classes.push('is-dragging')
  }

  return classes.join(' ')
}

function releaseCapture(
  target: HTMLElement,
  pointerId: number,
) {
  if (target.hasPointerCapture(pointerId)) {
    target.releasePointerCapture(pointerId)
  }
}

export function Modal({
  isOpen,
  title,
  onClose,
  children,
  variant = 'dark',
  disableSwipeClose = false,
}: ModalProps) {
  const [isRendered, setIsRendered] = useState(isOpen)
  const [isClosing, setIsClosing] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isSnapping, setIsSnapping] = useState(false)

  const dragStartY = useRef<number | null>(null)
  const dragFromGesture = useRef(false)
  const panelRef = useRef<HTMLDivElement>(null)

  /*
   * モーダルの開閉状態を管理
   */
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true)
      setIsClosing(false)
      setDragY(0)
      setIsDragging(false)
      setIsSnapping(false)
      dragFromGesture.current = false

      return
    }

    if (!isRendered) {
      return
    }

    if (variant !== 'sheet') {
      setIsRendered(false)
      return
    }

    setIsClosing(true)
  }, [isOpen, isRendered, variant])

  /*
   * 通常の閉じる処理
   *
   * ×ボタンや背景タップなどから閉じた場合は、
   * CSSアニメーション終了を待たずに一定時間後に
   * 必ずDOMから取り除く。
   */
  useEffect(() => {
    if (!isClosing || variant !== 'sheet') {
      return
    }

    /*
     * 下スワイプによる閉じる処理の場合は、
     * 下の別のuseEffectでフォールバックタイマーを管理する。
     */
    if (dragFromGesture.current) {
      return
    }

    const timer = window.setTimeout(() => {
      setIsRendered(false)
      setIsClosing(false)
      setDragY(0)
      setIsDragging(false)
      setIsSnapping(false)
      dragFromGesture.current = false
    }, SHEET_EXIT_MS + CLOSE_FALLBACK_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [isClosing, variant])

  /*
   * 下スワイプで閉じた場合
   *
   * CSSのtransitionendが発火しないブラウザでも、
   * 必ずモーダルをDOMから取り除けるようにする。
   */
  useEffect(() => {
    if (!isClosing || variant !== 'sheet') {
      return
    }

    if (!dragFromGesture.current) {
      return
    }

    const panelHeight =
      panelRef.current?.offsetHeight ?? window.innerHeight

    const frame = window.requestAnimationFrame(() => {
      setDragY(panelHeight)
    })

    const timer = window.setTimeout(() => {
      setIsRendered(false)
      setIsClosing(false)
      setDragY(0)
      setIsDragging(false)
      setIsSnapping(false)
      dragFromGesture.current = false
    }, SHEET_EXIT_MS + CLOSE_FALLBACK_MS)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [isClosing, variant])

  if (!isRendered) {
    return null
  }

  /*
   * 背景をタップして閉じる
   */
  const handleBackdropClick = (
    event: MouseEvent<HTMLDivElement>,
  ) => {
    if (isClosing || isDragging) {
      return
    }

    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  /*
   * 完全に閉じる
   */
  const finishClose = () => {
    setIsRendered(false)
    setIsClosing(false)
    setDragY(0)
    setIsDragging(false)
    setIsSnapping(false)
    dragFromGesture.current = false
    dragStartY.current = null
  }

  /*
   * CSS animation終了時
   */
  const handlePanelAnimationEnd = (
    event: AnimationEvent<HTMLDivElement>,
  ) => {
    if (event.target !== event.currentTarget) {
      return
    }

    if (!isClosing || dragFromGesture.current) {
      return
    }

    finishClose()
  }

  /*
   * CSS transition終了時
   */
  const handlePanelTransitionEnd = (
    event: TransitionEvent<HTMLDivElement>,
  ) => {
    if (event.target !== event.currentTarget) {
      return
    }

    if (event.propertyName !== 'transform') {
      return
    }

    /*
     * スワイプして少しだけ動かして
     * 元の位置に戻ってきた場合
     */
    if (isSnapping) {
      setIsSnapping(false)
      return
    }

    /*
     * 下スワイプで閉じた場合
     */
    if (!isClosing || !dragFromGesture.current) {
      return
    }

    finishClose()
  }

  /*
   * シートを下へスワイプ開始
   */
  const handleSheetPointerDown = (
    event: PointerEvent<HTMLDivElement>,
  ) => {
    if (variant !== 'sheet' || isClosing || disableSwipeClose) {
      return
    }

    /*
     * 入力欄・ボタン・本文スクロール領域では、
     * モーダルのスワイプ閉じを開始しない。
     * （ハンドル／ヘッダーからのみ閉じられる）
     */
    if (
      (event.target as HTMLElement).closest(
        'button, a, input, textarea, select, .modal-panel__body',
      )
    ) {
      return
    }

    dragStartY.current = event.clientY
    setIsDragging(true)

    event.currentTarget.setPointerCapture(event.pointerId)
  }

  /*
   * シートを下へスワイプ中
   */
  const handleSheetPointerMove = (
    event: PointerEvent<HTMLDivElement>,
  ) => {
    if (dragStartY.current === null || !isDragging) {
      return
    }

    const nextDragY = Math.max(
      0,
      event.clientY - dragStartY.current,
    )

    setDragY(nextDragY)
  }

  /*
   * シートのスワイプ終了
   */
  const handleSheetPointerUp = (
    event: PointerEvent<HTMLDivElement>,
  ) => {
    if (dragStartY.current === null) {
      return
    }

    releaseCapture(
      event.currentTarget,
      event.pointerId,
    )

    dragStartY.current = null
    setIsDragging(false)

    /*
     * 一定距離以上下へ動かした場合は閉じる
     */
    if (dragY >= DRAG_CLOSE_THRESHOLD) {
      dragFromGesture.current = true
      onClose()
      return
    }

    /*
     * 閾値未満なら元の位置へ戻す
     */
    setIsSnapping(true)
    setDragY(0)
  }

  /*
   * Pointer操作がキャンセルされた場合
   *
   * 以前はhandleSheetPointerUpをそのまま呼んでいたが、
   * スマホではキーボードやブラウザの操作によって
   * pointercancelが発生することがある。
   *
   * pointercancelでは「閉じる」のではなく、
   * 今回のドラッグをキャンセルして元の位置へ戻す。
   */
  const handleSheetPointerCancel = (
    event: PointerEvent<HTMLDivElement>,
  ) => {
    if (dragStartY.current === null) {
      return
    }

    releaseCapture(
      event.currentTarget,
      event.pointerId,
    )

    dragStartY.current = null
    setIsDragging(false)
    setIsSnapping(true)
    setDragY(0)
  }

  /*
   * シートの位置
   */
  const sheetStyle: CSSProperties | undefined =
    variant === 'sheet' &&
    (
      isDragging ||
      dragY > 0 ||
      isSnapping ||
      dragFromGesture.current
    )
      ? {
          transform: `translateY(${dragY}px)`,
          transition: isDragging
            ? 'none'
            : 'transform 0.28s ease',
          animation: 'none',
        }
      : undefined

  return (
    <div
      className={getBackdropClassName(
        variant,
        isClosing,
      )}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={handleBackdropClick}
    >
      <div
        ref={panelRef}
        className={getPanelClassName(
          variant,
          isClosing,
          isDragging,
        )}
        style={sheetStyle}
        onAnimationEnd={handlePanelAnimationEnd}
        onTransitionEnd={handlePanelTransitionEnd}
        onPointerDown={
          variant === 'sheet'
            ? handleSheetPointerDown
            : undefined
        }
        onPointerMove={
          variant === 'sheet'
            ? handleSheetPointerMove
            : undefined
        }
        onPointerUp={
          variant === 'sheet'
            ? handleSheetPointerUp
            : undefined
        }
        onPointerCancel={
          variant === 'sheet'
            ? handleSheetPointerCancel
            : undefined
        }
      >
        {variant === 'sheet' ? (
          <div
            className="modal-panel__handle"
            aria-hidden="true"
          />
        ) : null}

        <div className="modal-panel__header">
          {title ? <h2>{title}</h2> : null}

          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            disabled={isClosing}
          >
            ×
          </button>
        </div>

        {variant === 'sheet' ? (
          <div className="modal-panel__body">{children}</div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}