import { describe, expect, it } from 'vitest'
import { chatMessageSchema, messagesResponseSchema } from './chat'

/** GET /v1/events/{eventId}/messages が返す形(chatMessageResponse)。 */
const chatMessage = {
  id: '00000000-0000-4000-8000-0000000000m1',
  eventId: '00000000-0000-4000-8000-0000000000b2',
  clientMessageId: '00000000-0000-4000-8000-0000000000c1',
  sender: {
    id: '00000000-0000-4000-8000-0000000000u1',
    displayName: 'たろう',
    avatarUrl: null,
  },
  kind: 'TEXT',
  text: 'あしたたのしみ',
  sentAt: '2026-08-08T09:00:00Z',
}

describe('chatMessageSchema', () => {
  it('バックエンドが返すメッセージをそのまま受け入れる', () => {
    const parsed = chatMessageSchema.parse(chatMessage)

    expect(parsed.text).toBe('あしたたのしみ')
    expect(parsed.sender.avatarUrl).toBeNull()
  })

  it('avatarUrl が無ければ null になる', () => {
    const parsed = chatMessageSchema.parse({
      ...chatMessage,
      sender: { id: 'u1', displayName: 'たろう' },
    })

    expect(parsed.sender.avatarUrl).toBeNull()
  })

  it('kind は契約の TEXT だけ受け入れる', () => {
    expect(
      chatMessageSchema.safeParse({ ...chatMessage, kind: 'IMAGE' }).success,
    ).toBe(false)
  })

  it('必須フィールドが欠けていたら拒否する', () => {
    const { clientMessageId: _clientMessageId, ...rest } = chatMessage

    expect(chatMessageSchema.safeParse(rest).success).toBe(false)
  })
})

describe('messagesResponseSchema', () => {
  it('nextCursor つきの応答を受け入れる', () => {
    const parsed = messagesResponseSchema.parse({
      messages: [chatMessage],
      nextCursor: 'MjAyNi0wOC0wOA==',
    })

    expect(parsed.messages).toHaveLength(1)
    expect(parsed.nextCursor).toBe('MjAyNi0wOC0wOA==')
  })

  it('messages が null / 未指定でも空配列にする', () => {
    expect(
      messagesResponseSchema.parse({ messages: null, nextCursor: null })
        .messages,
    ).toEqual([])
    expect(messagesResponseSchema.parse({}).messages).toEqual([])
  })

  it('要素が契約と違えば拒否する', () => {
    const result = messagesResponseSchema.safeParse({
      messages: [{ ...chatMessage, sentAt: 12345 }],
      nextCursor: null,
    })

    expect(result.success).toBe(false)
  })
})
