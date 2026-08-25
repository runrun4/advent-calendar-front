import type { ChatMessage, ChatUser } from '../schemas/chat'

// 型は schemas/chat.ts の Zod スキーマから導出したものを再輸出する。
// 呼び出し側は従来どおり types/chat から import できる。
export type { ChatMessage, ChatUser }

export type ChatConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'error'

type RealtimeChatRow = {
  id: string
  event_id: string
  client_message_id: string
  sender_user_id: string
  body: string
  sent_at: string
}

export function messageFromRealtimeRow(
  row: RealtimeChatRow,
  members: Map<string, ChatUser>,
): ChatMessage {
  const sender = members.get(row.sender_user_id) ?? {
    id: row.sender_user_id,
    displayName: 'メンバー',
    avatarUrl: null,
  }

  return {
    id: row.id,
    eventId: row.event_id,
    clientMessageId: row.client_message_id,
    sender,
    kind: 'TEXT',
    text: row.body,
    sentAt: row.sent_at,
  }
}
