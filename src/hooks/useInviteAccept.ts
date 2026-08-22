import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../services/apiClient'
import { acceptInvitation } from '../services/eventApi'
import {
  clearPendingInviteToken,
  getPendingInviteToken,
} from '../services/inviteToken'

export type InviteAcceptResult =
  /** 201: 今回参加した */
  | { kind: 'joined'; eventName: string }
  /** 200: 既に参加済みだった */
  | { kind: 'already'; eventName: string }
  /** 招待が使えない、または通信に失敗した */
  | { kind: 'failed'; message: string }

const INVALID_INVITE_MESSAGE = '招待リンクが無効か期限切れです。'
const RETRYABLE_MESSAGE =
  '招待の参加処理に失敗しました。通信環境を確認して、もう一度リンクを開いてください。'

type Outcome = {
  /** true なら sessionStorage のトークンを捨てる(確定失敗)。 */
  consumeToken: boolean
  /** null ならユーザーには何も出さない。 */
  message: string | null
}

/**
 * 失敗を「確定失敗(トークンを捨てる)」と「再試行可能(トークンを残す)」に振り分ける。
 *
 * 契約: docs/api/openapi.yaml の POST /v1/invitations/{token}/accept
 * - 404 NOT_FOUND        … トークンが存在しない
 * - 409 INVITATION_*     … 無効・期限切れ
 * - 401 UNAUTHENTICATED  … セッション切れ。ログインし直せば同じトークンで通る
 */
function classifyError(error: unknown): Outcome {
  if (!(error instanceof ApiError)) {
    // fetch の失敗(オフライン等)。トークンは残して次回起動で再試行する。
    return { consumeToken: false, message: RETRYABLE_MESSAGE }
  }

  if (error.status === 401 || error.code === 'UNAUTHENTICATED') {
    // まだログインが確立していないだけ。黙って次の機会に回す。
    return { consumeToken: false, message: null }
  }

  if (
    error.code === 'INVITATION_INVALID' ||
    error.code === 'INVITATION_EXPIRED' ||
    error.code === 'NOT_FOUND' ||
    (error.status >= 400 && error.status < 500)
  ) {
    return { consumeToken: true, message: INVALID_INVITE_MESSAGE }
  }

  // 5xx。サーバ側の一時障害とみなして残す。
  return { consumeToken: false, message: RETRYABLE_MESSAGE }
}

type UseInviteAcceptOptions = {
  /** 認証が済んでいて承認を実行してよいか。 */
  enabled: boolean
  /** 参加が成立したときに呼ばれる(イベント一覧の再読込用)。 */
  onJoined?: () => void
}

/**
 * 保持中の招待トークンがあれば、認証後に一度だけ承認APIを呼ぶ。
 *
 * 二重実行防止は「処理済みトークン」を ref に覚える方式。
 * ref は StrictMode の二重マウント(同一インスタンスの再マウント)をまたいで
 * 保持されるので、開発時でもリクエストは 1 回に収まる。
 */
export function useInviteAccept({
  enabled,
  onJoined,
}: UseInviteAcceptOptions) {
  const [result, setResult] = useState<InviteAcceptResult | null>(null)
  const handledTokenRef = useRef<string | null>(null)
  const onJoinedRef = useRef(onJoined)

  useEffect(() => {
    onJoinedRef.current = onJoined
  }, [onJoined])

  useEffect(() => {
    if (!enabled) return

    const token = getPendingInviteToken()
    if (!token) return
    if (handledTokenRef.current === token) return
    handledTokenRef.current = token

    /*
     * 途中でのキャンセルはしない。
     * StrictMode ではクリーンアップ直後に同じインスタンスが再マウントされるため、
     * cancel フラグを立てると結果を捨てたままモーダルが出せなくなる。
     * 本当にアンマウントされた場合の setState は React 19 では無害。
     */
    const run = async () => {
      try {
        const accepted = await acceptInvitation(token)
        clearPendingInviteToken()
        onJoinedRef.current?.()
        setResult({
          kind: accepted.alreadyJoined ? 'already' : 'joined',
          eventName: accepted.event.name,
        })
      } catch (error) {
        const outcome = classifyError(error)

        if (outcome.consumeToken) {
          clearPendingInviteToken()
        } else {
          // 残すなら次のマウントで再試行できるようにガードも解除する。
          handledTokenRef.current = null
        }

        if (outcome.message !== null) {
          setResult({ kind: 'failed', message: outcome.message })
        }
      }
    }

    void run()
  }, [enabled])

  return {
    result,
    dismissResult: () => setResult(null),
  }
}
