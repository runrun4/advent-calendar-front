/**
 * パスワード再設定メールのリンク(`/auth/reset-password`)の受け取り口。
 *
 * このアプリはルーターを持たないため、起動時(main.tsx、レンダリング前)に
 * 一度だけ URL を解析する。Supabase のクライアントは非同期で URL の
 * ハッシュを消費する(トークンの取り込み・消去)ので、エラー情報など
 * 後から読めなくなるものはここで先に控えておく。
 */

export const RESET_PASSWORD_PATH = '/auth/reset-password'

type RecoveryLinkState = {
  active: boolean
  /** メールのリンク自体が期限切れ・不正だった場合 true */
  linkError: boolean
}

let state: RecoveryLinkState = { active: false, linkError: false }

export function captureRecoveryLinkFromUrl(): void {
  if (typeof window === 'undefined') return
  const { pathname, hash, search } = window.location
  const active = pathname.replace(/\/+$/, '') === RESET_PASSWORD_PATH
  if (!active) {
    state = { active: false, linkError: false }
    return
  }
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const query = new URLSearchParams(search)
  const linkError =
    params.has('error') ||
    params.has('error_code') ||
    query.has('error') ||
    query.has('error_code')
  state = { active: true, linkError }
}

export function isRecoveryRoute(): boolean {
  return state.active
}

export function hasRecoveryLinkError(): boolean {
  return state.linkError
}

/** 再設定画面を抜けるとき。URL を `/` に戻して再読込でも戻らないようにする。 */
export function leaveRecoveryRoute(): void {
  state = { active: false, linkError: false }
  if (typeof window !== 'undefined') {
    window.history.replaceState(null, '', '/')
  }
}
