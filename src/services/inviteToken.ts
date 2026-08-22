/**
 * 招待リンク(`{INVITE_URL_BASE}/invite/{token}`)の受け取り口。
 *
 * このアプリはルーターを持たない(画面遷移は state による条件レンダリング)ため、
 * 起動時に一度だけ `location.pathname` を手動で解析してトークンを取り出し、
 * URL は `/` に戻してから通常の起動フローに合流する。
 *
 * トークンは sessionStorage に置く。未ログインで開かれた場合でも、
 * ログイン／サインアップ完了後に同じタブでそのまま承認フローへ進めるため。
 */

const STORAGE_KEY = 'runrun.pendingInviteToken'

/**
 * バックエンドの inviteTokenPattern と同じ形式(URL-safe base64)。
 * パス用と単体検証用で二重管理にならないよう、字種はここだけに書く。
 */
const TOKEN_SOURCE = '[A-Za-z0-9_-]{16,128}'
const INVITE_TOKEN_PATTERN = new RegExp(`^${TOKEN_SOURCE}$`)
const INVITE_PATH_PATTERN = new RegExp(`^/invite/(${TOKEN_SOURCE})/?$`)

/**
 * sessionStorage は Safari のプライベートモード等で例外を投げることがあるため、
 * 参照は必ずここを通して失敗を握りつぶす(招待が通らないだけで起動は妨げない)。
 */
function getStorage(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function getPendingInviteToken(): string | null {
  const storage = getStorage()
  if (!storage) return null

  try {
    const token = storage.getItem(STORAGE_KEY)
    if (token === null) return null
    // 保存後に書き換えられた値を信用しない。
    return INVITE_TOKEN_PATTERN.test(token) ? token : null
  } catch {
    return null
  }
}

export function savePendingInviteToken(token: string): void {
  try {
    getStorage()?.setItem(STORAGE_KEY, token)
  } catch {
    // 保存できない環境では今回の起動中だけ招待が効かない。
  }
}

export function clearPendingInviteToken(): void {
  try {
    getStorage()?.removeItem(STORAGE_KEY)
  } catch {
    /*
     * 消せなくても、承認APIは冪等(既に参加済みなら200)なので
     * 次の起動で同じトークンを送っても二重参加にはならない。
     */
  }
}

/**
 * 起動時に一度だけ呼ぶ。`/invite/{token}` なら
 * トークンを保存して URL を `/` に戻す。
 *
 * React のレンダリング前(main.tsx)に呼ぶので、
 * StrictMode の二重マウントの影響を受けない。
 */
export function captureInviteTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null

  const matched = INVITE_PATH_PATTERN.exec(window.location.pathname)
  if (!matched) return null

  const token = matched[1]
  savePendingInviteToken(token)

  // ルーターがないので `/invite/...` のままだと再読込で 404 相当になる。
  window.history.replaceState(
    null,
    '',
    `/${window.location.search}${window.location.hash}`,
  )

  return token
}
