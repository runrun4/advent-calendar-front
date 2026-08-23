import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { ArrowUp, ChevronLeft } from 'lucide-react'
import { useChat } from '../../hooks/useChat'
import type { ChatConnectionStatus } from '../../types/chat'
import './ChatView.css'

type ChatViewProps = {
  eventId: string
  eventTitle: string
  onBack: () => void
  currentUserId: string | null
}

function formatMessageTime(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function connectionStatusLabel(
  status: ChatConnectionStatus,
): string {
  switch (status) {
    case 'connected':
      return 'WS 接続'
    case 'error':
      return 'WS 未接続'
    default:
      return 'WS 接続中…'
  }
}

export function ChatView({
  eventId,
  eventTitle,
  onBack,
  currentUserId,
}: ChatViewProps) {
  const {
    messages,
    isLoading,
    isSending,
    connectionStatus,
    error,
    sendMessage,
  } = useChat(eventId)

  const [draft, setDraft] = useState('')

  const inputRef =
    useRef<HTMLInputElement>(null)

  const mainRef =
    useRef<HTMLElement>(null)

  /*
   * ChatView 内のスクロール領域だけを
   * 一番下までスクロールする。
   *
   * scrollIntoView() は document / body まで
   * スクロールする可能性があるため使用しない。
   */
  const scrollToBottom = (
    behavior: ScrollBehavior = 'auto',
  ) => {
    const el = mainRef.current

    if (!el) {
      return
    }

    el.scrollTo({
      top: el.scrollHeight,
      behavior,
    })
  }

  /*
   * スマホのソフトキーボード表示時に
   * visualViewport の高さが変化するため、
   * CSS変数 --chat-viewport-height に反映する。
   */
  useEffect(() => {
    const updateViewportHeight = () => {
      const viewport =
        window.visualViewport

      if (!viewport) {
        document.documentElement.style.setProperty(
          '--chat-viewport-height',
          `${window.innerHeight}px`,
        )
        return
      }

      document.documentElement.style.setProperty(
        '--chat-viewport-height',
        `${viewport.height}px`,
      )
    }

    updateViewportHeight()

    const viewport =
      window.visualViewport

    viewport?.addEventListener(
      'resize',
      updateViewportHeight,
    )

    viewport?.addEventListener(
      'scroll',
      updateViewportHeight,
    )

    window.addEventListener(
      'resize',
      updateViewportHeight,
    )

    return () => {
      viewport?.removeEventListener(
        'resize',
        updateViewportHeight,
      )

      viewport?.removeEventListener(
        'scroll',
        updateViewportHeight,
      )

      window.removeEventListener(
        'resize',
        updateViewportHeight,
      )
    }
  }, [])

  /*
   * メッセージが増えたら、
   * ChatView 内のスクロール領域だけを
   * 一番下までスクロールする。
   */
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollToBottom('smooth')
    })
  }, [messages.length])

  /*
   * キーボードが開いた直後にも、
   * document 全体ではなく ChatView の
   * スクロール領域だけを一番下へ移動する。
   */
  useEffect(() => {
    const viewport =
      window.visualViewport

    if (!viewport) {
      return
    }

    const handleViewportResize = () => {
      requestAnimationFrame(() => {
        scrollToBottom('auto')
      })
    }

    viewport.addEventListener(
      'resize',
      handleViewportResize,
    )

    return () => {
      viewport.removeEventListener(
        'resize',
        handleViewportResize,
      )
    }
  }, [])

  const handleSubmit = async () => {
    const text = draft.trim()

    if (!text || isSending) {
      return
    }

    /*
     * await の前に実行する。
     *
     * iOS Safari では await 後の focus() は
     * ユーザー操作のコンテキストから外れるため、
     * キーボードを再表示できない場合がある。
     *
     * 先に入力内容をクリアし、
     * 同期的に input へフォーカスを戻すことで
     * キーボードを開いたまま送信する。
     */
    setDraft('')
    inputRef.current?.focus()

    try {
      await sendMessage(text)
    } catch {
      /*
       * 送信に失敗した場合は入力内容を戻す。
       */
      setDraft(text)

      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (
      event.key === 'Enter' &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      void handleSubmit()
    }
  }

  /*
   * ChatView は position: fixed で全画面表示するが、
   * 祖先の .page-slider が transform を持つため、そのまま描画すると
   * fixed の基準がビューポートではなく .page-slider (幅 200%、左に 50% 移動)
   * になってしまい、画面が左にズレて下端もはみ出す。
   * createPortal で document.body 直下に描画して、基準をビューポートに戻す。
   */
  return createPortal(
    <div className="chat-view">
      <header className="chat-view__header">
        <button
          type="button"
          className="chat-view__back-button"
          onClick={onBack}
          aria-label="戻る"
        >
          <ChevronLeft
            size={28}
            strokeWidth={2}
          />
        </button>

        <div className="chat-view__header-text">
          <h1 className="chat-view__title">
            チャット
          </h1>

          <p className="chat-view__subtitle">
            {eventTitle}
          </p>
        </div>

        <div
          className={`chat-view__ws-status chat-view__ws-status--${connectionStatus}`}
          aria-live="polite"
          title="Supabase Realtime (WebSocket)"
        >
          <span
            className="chat-view__ws-dot"
            aria-hidden="true"
          />

          <span className="chat-view__ws-label">
            {connectionStatusLabel(
              connectionStatus,
            )}
          </span>
        </div>
      </header>

      <main
        ref={mainRef}
        className="chat-view__main"
      >
        {isLoading ? (
          <p className="chat-view__empty">
            読み込み中…
          </p>
        ) : messages.length === 0 ? (
          <p className="chat-view__empty">
            メッセージはまだありません
          </p>
        ) : (
          <ul className="chat-view__messages">
            {messages.map((message) => {
              const isOwn =
                message.sender.id ===
                currentUserId

              if (isOwn) {
                return (
                  <li
                    key={message.id}
                    className="chat-view__message chat-view__message--own"
                  >
                    <time
                      className="chat-view__time"
                      dateTime={
                        message.sentAt
                      }
                    >
                      {formatMessageTime(
                        message.sentAt,
                      )}
                    </time>

                    <div className="chat-view__bubble chat-view__bubble--own">
                      <p className="chat-view__text">
                        {message.text}
                      </p>
                    </div>
                  </li>
                )
              }

              return (
                <li
                  key={message.id}
                  className="chat-view__message chat-view__message--other"
                >
                  <div className="chat-view__sender-block">
                    <div
                      className="chat-view__avatar"
                      aria-hidden="true"
                    >
                      {message.sender
                        .avatarUrl ? (
                        <img
                          src={
                            message.sender
                              .avatarUrl
                          }
                          alt=""
                          className="chat-view__avatar-image"
                        />
                      ) : (
                        <span className="chat-view__avatar-initial">
                          {message.sender.displayName.slice(
                            0,
                            1,
                          ) || '?'}
                        </span>
                      )}
                    </div>

                    <div className="chat-view__content">
                      <span className="chat-view__sender-name">
                        {
                          message.sender
                            .displayName
                        }
                      </span>

                      <div className="chat-view__bubble chat-view__bubble--other">
                        <p className="chat-view__text">
                          {message.text}
                        </p>
                      </div>
                    </div>
                  </div>

                  <time
                    className="chat-view__time"
                    dateTime={
                      message.sentAt
                    }
                  >
                    {formatMessageTime(
                      message.sentAt,
                    )}
                  </time>
                </li>
              )
            })}
          </ul>
        )}

        {error ? (
          <p className="chat-view__error">
            {error}
          </p>
        ) : null}
      </main>

      <footer className="chat-view__composer">
        <div className="chat-view__composer-inner">
          <input
            ref={inputRef}
            type="text"
            className="chat-view__input"
            placeholder=""
            value={draft}
            onChange={(event) =>
              setDraft(
                event.target.value,
              )
            }
            onKeyDown={handleKeyDown}
            aria-label="メッセージを入力"
            autoComplete="off"
            enterKeyHint="send"
          />

          <button
            type="button"
            className="chat-view__send-button"
            aria-label="送信"
            disabled={
              !draft.trim() ||
              isSending
            }
            onPointerDown={(event) =>
              event.preventDefault()
            }
            onClick={() =>
              void handleSubmit()
            }
          >
            <ArrowUp
              size={22}
              strokeWidth={2.5}
            />
          </button>
        </div>
      </footer>
    </div>,
    document.body,
  )
}