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

/** サーバがユーザー向け文言を返さなかったときだけ使う保険。 */
const FALLBACK_INVALID_MESSAGE = '招待リンクが無効か期限切れです。'
const RETRYABLE_MESSAGE =
  '招待の参加処理に失敗しました。通信環境を確認して、もう一度リンクを開いてください。'

/** 401(セッション確立待ち)のときに自動でやり直す間隔と上限回数。 */
const AUTH_RETRY_DELAY_MS = 4000
const MAX_AUTH_RETRIES = 1

/** ApiError が本文の message 不在時に入れるダミー文言。 */
const PLACEHOLDER_MESSAGE_PATTERN = /^API error \(\d+\)$/

type Outcome = {
  /** true なら sessionStorage のトークンを捨てる(確定失敗)。 */
  consumeToken: boolean
  /** null ならこの時点ではユーザーに何も出さない。 */
  message: string | null
  /** true なら少し待ってもう一度だけ承認を試みる。 */
  retryAfterDelay: boolean
}

/**
 * サーバの message はユーザー向けの日本語文言なので、そのまま出す
 * (ShareInviteModal と同じ方針)。
 *
 * バックエンドは INVITATION_EXPIRED「有効期限が切れています」と
 * INVITATION_INVALID「利用できません」を、再発行導線の出し分けのため
 * 意図的に分けている。フロントで同じ文言に潰さないこと。
 */
function toUserMessage(error: ApiError, fallback: string): string {
  const message = error.message.trim()

  if (message === '' || PLACEHOLDER_MESSAGE_PATTERN.test(message)) {
    return fallback
  }

  return message
}

/**
 * 失敗を「確定失敗(トークンを捨てる)」と「再試行可能(トークンを残す)」に振り分ける。
 *
 * 契約: docs/api/openapi.yaml の POST /v1/invitations/{token}/accept
 * - 404 NOT_FOUND        … トークンが存在しない
 * - 409 INVITATION_*     … 期限切れ / 利用不可
 * - 401 UNAUTHENTICATED  … セッション未確立。同じトークンで通る可能性がある
 */
function classifyError(error: unknown): Outcome {
  if (!(error instanceof ApiError)) {
    // fetch 自体の失敗(オフライン等)。トークンは残して次の機会に再試行する。
    return {
      consumeToken: false,
      message: RETRYABLE_MESSAGE,
      retryAfterDelay: false,
    }
  }

  /*
   * 招待そのものが使えないと確定するのはこの2つだけ。
   * 429 など他の4xx はサーバ側の一時的な事情なので捨てない。
   */
  if (error.status === 404 || error.status === 409) {
    return {
      consumeToken: true,
      message: toUserMessage(error, FALLBACK_INVALID_MESSAGE),
      retryAfterDelay: false,
    }
  }

  if (error.status === 401 || error.code === 'UNAUTHENTICATED') {
    // アクセストークンの取得が間に合っていないだけの可能性がある。
    return { consumeToken: false, message: null, retryAfterDelay: true }
  }

  // 5xx やその他の4xx。いずれも一時的とみなしてトークンは残す。
  return {
    consumeToken: false,
    message: RETRYABLE_MESSAGE,
    retryAfterDelay: false,
  }
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
  const [retryTick, setRetryTick] = useState(0)
  const handledTokenRef = useRef<string | null>(null)
  const authRetryCountRef = useRef(0)
  const retryTimerRef = useRef<number | undefined>(undefined)
  const onJoinedRef = useRef(onJoined)

  useEffect(() => {
    onJoinedRef.current = onJoined
  }, [onJoined])

  // 保留中の再試行タイマーはアンマウント時に片付ける。
  useEffect(
    () => () => {
      if (retryTimerRef.current !== undefined) {
        window.clearTimeout(retryTimerRef.current)
      }
    },
    [],
  )

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
          setResult({
            kind: 'failed',
            message: outcome.message ?? FALLBACK_INVALID_MESSAGE,
          })
          return
        }

        // トークンを残すなら、次の試行に備えてガードも解除する。
        handledTokenRef.current = null

        if (
          outcome.retryAfterDelay &&
          authRetryCountRef.current < MAX_AUTH_RETRIES
        ) {
          authRetryCountRef.current += 1
          retryTimerRef.current = window.setTimeout(() => {
            retryTimerRef.current = undefined
            setRetryTick((tick) => tick + 1)
          }, AUTH_RETRY_DELAY_MS)
          return
        }

        /*
         * 自動再試行を使い切った場合も含め、必ず何かを出す。
         * 黙って終わると「リンクを開いたのに何も起きない」状態になる。
         */
        setResult({
          kind: 'failed',
          message: outcome.message ?? RETRYABLE_MESSAGE,
        })
      }
    }

    void run()
  }, [enabled, retryTick])

  return {
    result,
    dismissResult: () => setResult(null),
  }
}
