export type ChatUser = {
  id: string
  displayName: string
  avatarUrl: string | null
}

export type ChatMessage = {
  id: string
  eventId: string
  clientMessageId: string
  sender: ChatUser
  kind: 'TEXT'
  text: string
  sentAt: string
}

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

/** Realtime / DB テキスト形式を ISO UTC に正規化する。 */
export function normalizeSentAt(value: string): string {
  const normalized = value.includes('T') ? value : value.replace(' ', 'T')
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString()
  }
  return parsed.toISOString()
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
    sentAt: normalizeSentAt(row.sent_at),
  }
}
