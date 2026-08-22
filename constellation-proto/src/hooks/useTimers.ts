// ==========================================
// setTimeout の一括管理
// unmount時 / デバッグ操作時に確実に一括 clear できるよう、
// 発行した timer id を配列で保持する (IMPLEMENTATION_NOTES §1-6)
// ==========================================
import { useCallback, useEffect, useRef } from 'react'

export type UseTimersReturn = {
  /** window.setTimeout のラッパー。発行した id を内部配列に登録する */
  later: (fn: () => void, ms: number) => number
  /** 保持中の timer を全て clear する */
  clearAll: () => void
}

export const useTimers = (): UseTimersReturn => {
  const timers = useRef<number[]>([])

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current = timers.current.filter((t) => t !== id)
      fn()
    }, ms)
    timers.current.push(id)
    return id
  }, [])

  const clearAll = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
  }, [])

  useEffect(() => clearAll, [clearAll])

  return { later, clearAll }
}
