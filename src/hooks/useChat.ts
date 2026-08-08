import { useState } from 'react'
import type { ChatMessage } from '../types/chat'

export function useChat(_eventId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isSending, setIsSending] = useState(false)

  return {
    messages,
    setMessages,
    isSending,
    setIsSending,
  }
}
