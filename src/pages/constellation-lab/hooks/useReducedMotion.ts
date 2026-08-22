// ==========================================
// prefers-reduced-motion 検出
// ========================================== */
import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

const getInitial = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(QUERY).matches

/** OS/ブラウザ設定の prefers-reduced-motion を購読する */
export const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(getInitial)

  useEffect(() => {
    if (!window.matchMedia) return
    const mql = window.matchMedia(QUERY)
    const onChange = () => setReduced(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return reduced
}
