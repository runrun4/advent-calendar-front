import { apiRequest } from './apiClient'
import type { ChatMessage } from '../types/chat'

type MessagesResponse = {
  messages: ChatMessage[]
  nextCursor: string | null
}

export async function fetchMessages(
  eventId: string,
  signal?: AbortSignal,
): Promise<ChatMessage[]> {
  const data = await apiRequest<MessagesResponse>(
    `/v1/events/${eventId}/messages`,
    { signal },
  )
  return data.messages ?? []
}

export async function sendMessage(
  eventId: string,
  clientMessageId: string,
  text: string,
): Promise<ChatMessage> {
  return apiRequest<ChatMessage>(`/v1/events/${eventId}/messages`, {
    method: 'POST',
    body: { clientMessageId, text },
  })
}
