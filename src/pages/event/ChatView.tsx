import { ChevronLeft } from 'lucide-react'
import './ChatView.css'

type ChatViewProps = {
  eventTitle: string
  onBack: () => void
}

export function ChatView({ eventTitle, onBack }: ChatViewProps) {
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
      </header>

      <main className="chat-view__main">
        <p className="chat-view__empty">メッセージはまだありません</p>
      </main>
    </div>
  )
}
