import { apiRequestValidated } from './apiClient'
import {
  chatMessageSchema,
  messagesResponseSchema,
  type ChatMessage,
} from '../schemas/chat'

export async function fetchMessages(
  eventId: string,
  signal?: AbortSignal,
): Promise<ChatMessage[]> {
  const data = await apiRequestValidated(
    `/v1/events/${eventId}/messages`,
    messagesResponseSchema,
    { signal },
  )
  return data.messages
}

/** 201=今回送信 / 200=同一 clientMessageId の再送。どちらも ChatMessage が返る。 */
export async function sendMessage(
  eventId: string,
  clientMessageId: string,
  text: string,
): Promise<ChatMessage> {
  return apiRequestValidated(
    `/v1/events/${eventId}/messages`,
    chatMessageSchema,
    {
      method: 'POST',
      body: { clientMessageId, text },
    },
  )
}
