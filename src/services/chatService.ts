import type { ChatMessage } from '../types/chat'

export async function fetchMessages(_eventId: string): Promise<ChatMessage[]> {
  return []
}

export async function sendMessage(
  _eventId: string,
  _body: string,
): Promise<ChatMessage> {
  throw new Error('Not implemented')
}
