import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowUp, ChevronLeft } from 'lucide-react'
import { useChat } from '../../hooks/useChat'
import { useAuth } from '../../hooks/useAuth'
import type { ChatConnectionStatus } from '../../types/chat'
import './ChatView.css'

type ChatViewProps = {
  eventId: string
  eventTitle: string
  onBack: () => void
}

function formatMessageTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function connectionStatusLabel(status: ChatConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'WS 接続'
    case 'error':
      return 'WS 未接続'
    default:
      return 'WS 接続中…'
  }
}

export function ChatView({ eventId, eventTitle, onBack }: ChatViewProps) {
  const { user } = useAuth()
  const { messages, isLoading, isSending, connectionStatus, error, sendMessage } =
    useChat(eventId)

  const [draft, setDraft] = useState('')
  const listEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSubmit = async () => {
    const text = draft.trim()
    if (!text || isSending) return

    try {
      await sendMessage(text)
      setDraft('')
    } catch {
      // error state is handled in useChat
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <div className="chat-view">
      <header className="chat-view__header">
        <button
          type="button"
          className="chat-view__back-button"
          onClick={onBack}
          aria-label="戻る"
        >
          <ChevronLeft size={28} strokeWidth={2} />
        </button>
        <div className="chat-view__header-text">
          <h1 className="chat-view__title">チャット</h1>
          <p className="chat-view__subtitle">{eventTitle}</p>
        </div>
        <div
          className={`chat-view__ws-status chat-view__ws-status--${connectionStatus}`}
          aria-live="polite"
          title="Supabase Realtime (WebSocket)"
        >
          <span className="chat-view__ws-dot" aria-hidden="true" />
          <span className="chat-view__ws-label">
            {connectionStatusLabel(connectionStatus)}
          </span>
        </div>
      </header>

      <main className="chat-view__main">
        {isLoading ? (
          <p className="chat-view__empty">読み込み中…</p>
        ) : messages.length === 0 ? (
          <p className="chat-view__empty">メッセージはまだありません</p>
        ) : (
          <ul className="chat-view__messages">
            {messages.map((message) => {
              const isOwn = message.sender.id === user?.id

              if (isOwn) {
                return (
                  <li
                    key={message.id}
                    className="chat-view__message chat-view__message--own"
                  >
                    <time
                      className="chat-view__time"
                      dateTime={message.sentAt}
                    >
                      {formatMessageTime(message.sentAt)}
                    </time>
                    <div className="chat-view__bubble chat-view__bubble--own">
                      <p className="chat-view__text">{message.text}</p>
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
                      {message.sender.avatarUrl ? (
                        <img
                          src={message.sender.avatarUrl}
                          alt=""
                          className="chat-view__avatar-image"
                        />
                      ) : (
                        <span className="chat-view__avatar-initial">
                          {message.sender.displayName.slice(0, 1) || '?'}
                        </span>
                      )}
                    </div>
                    <div className="chat-view__content">
                      <span className="chat-view__sender-name">
                        {message.sender.displayName}
                      </span>
                      <div className="chat-view__bubble chat-view__bubble--other">
                        <p className="chat-view__text">{message.text}</p>
                      </div>
                    </div>
                  </div>
                  <time
                    className="chat-view__time"
                    dateTime={message.sentAt}
                  >
                    {formatMessageTime(message.sentAt)}
                  </time>
                </li>
              )
            })}
            <li ref={listEndRef} aria-hidden="true" />
          </ul>
        )}

        {error ? <p className="chat-view__error">{error}</p> : null}
      </main>

      <footer className="chat-view__composer">
        <div className="chat-view__composer-inner">
          <input
            type="text"
            className="chat-view__input"
            placeholder=""
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="メッセージを入力"
            disabled={isSending}
          />
          <button
            type="button"
            className="chat-view__send-button"
            aria-label="送信"
            disabled={!draft.trim() || isSending}
            onClick={() => void handleSubmit()}
          >
            <ArrowUp size={22} strokeWidth={2.5} />
          </button>
        </div>
      </footer>
    </div>
  )
}
