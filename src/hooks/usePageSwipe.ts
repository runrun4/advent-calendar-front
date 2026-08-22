import { useRef, useState, type PointerEvent } from 'react'

type GestureAxis = 'pending' | 'horizontal' | 'vertical'

const SWIPE_THRESHOLD = 100
const AXIS_LOCK_DISTANCE = 12

function releaseCapture(target: HTMLElement, pointerId: number) {
  if (target.hasPointerCapture(pointerId)) {
    target.releasePointerCapture(pointerId)
  }
}

export function usePageSwipe<T extends string>(
  tabs: T[],
  initialTab: T,
  disabled = false,
) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const pointerStart = useRef<{
    x: number
    y: number
    id: number
  } | null>(null)

  const gestureAxis = useRef<GestureAxis>('pending')

  const currentIndex = tabs.indexOf(activeTab)

  const resetGesture = () => {
    pointerStart.current = null
    gestureAxis.current = 'pending'
    setIsDragging(false)
    setDragOffset(0)
  }

const onPointerDown = (event: PointerEvent<HTMLElement>) => {
  // 詳細画面を開いている場合はスワイプ開始しない
  if (disabled) return

  if (event.pointerType === 'mouse' && event.button !== 0) return

  pointerStart.current = {
    x: event.clientX,
    y: event.clientY,
    id: event.pointerId,
  }

  gestureAxis.current = 'pending'
}

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    // 詳細画面を開いている場合は処理しない
    if (disabled) return

    const start = pointerStart.current

    if (start === null || start.id !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - start.x
    const deltaY = event.clientY - start.y

    if (gestureAxis.current === 'pending') {
      if (
        Math.max(
          Math.abs(deltaX),
          Math.abs(deltaY),
        ) < AXIS_LOCK_DISTANCE
      ) {
        return
      }

      const isHorizontal =
        Math.abs(deltaX) > Math.abs(deltaY)

      gestureAxis.current = isHorizontal
        ? 'horizontal'
        : 'vertical'

      if (!isHorizontal) return

      event.currentTarget.setPointerCapture(
        event.pointerId,
      )

      setIsDragging(true)
    }

    if (gestureAxis.current !== 'horizontal') {
      return
    }

    const atStart =
      currentIndex === 0 && deltaX > 0

    const atEnd =
      currentIndex === tabs.length - 1 &&
      deltaX < 0

    setDragOffset(
      atStart || atEnd
        ? deltaX * 0.2
        : deltaX,
    )
  }

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    // 詳細画面を開いている場合は処理しない
    if (disabled) {
      resetGesture()
      return
    }

    const start = pointerStart.current

    if (
      start === null ||
      start.id !== event.pointerId
    ) {
      return
    }

    releaseCapture(
      event.currentTarget,
      event.pointerId,
    )

    const deltaX =
      event.clientX - start.x

    const axis =
      gestureAxis.current

    pointerStart.current = null
    gestureAxis.current = 'pending'
    setIsDragging(false)

    if (
      axis !== 'horizontal' ||
      Math.abs(deltaX) < SWIPE_THRESHOLD
    ) {
      setDragOffset(0)
      return
    }

    if (
      deltaX < 0 &&
      currentIndex < tabs.length - 1
    ) {
      setActiveTab(
        tabs[currentIndex + 1],
      )
    }

    if (
      deltaX > 0 &&
      currentIndex > 0
    ) {
      setActiveTab(
        tabs[currentIndex - 1],
      )
    }

    setDragOffset(0)
  }

  const onPointerCancel = (
    event: PointerEvent<HTMLElement>,
  ) => {
    releaseCapture(
      event.currentTarget,
      event.pointerId,
    )

    resetGesture()
  }

  return {
    activeTab,
    currentIndex,
    dragOffset,
    isDragging,

    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
    setActiveTab,
  }
}