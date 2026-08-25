import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './apiClient'
import { fetchMessages, sendMessage } from './chatService'

vi.mock('./authService', () => ({
  getAccessToken: async () => 'test-token',
}))

const chatMessage = {
  id: 'm1',
  eventId: 'b2',
  clientMessageId: 'c1',
  sender: { id: 'u1', displayName: 'たろう', avatarUrl: null },
  kind: 'TEXT',
  text: 'あしたたのしみ',
  sentAt: '2026-08-08T09:00:00Z',
}

function mockResponse(body: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        }),
    ),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('fetchMessages', () => {
  it('契約どおりの応答は検証して返す', async () => {
    mockResponse({ messages: [chatMessage], nextCursor: null })

    const messages = await fetchMessages('b2')

    expect(messages).toHaveLength(1)
    expect(messages[0].text).toBe('あしたたのしみ')
  })

  it('messages が null でも空配列を返す', async () => {
    mockResponse({ messages: null, nextCursor: null })

    await expect(fetchMessages('b2')).resolves.toEqual([])
  })

  it('一覧そのものの形が違う応答は ApiError にする', async () => {
    mockResponse({ messages: 'なし', nextCursor: null })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(fetchMessages('b2')).rejects.toBeInstanceOf(ApiError)
  })

  it('契約外の要素は読み飛ばし、残りを返す(画面を空にしない)', async () => {
    mockResponse({
      messages: [{ ...chatMessage, sender: null }, chatMessage],
      nextCursor: null,
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(fetchMessages('b2')).resolves.toHaveLength(1)
  })
})

describe('sendMessage', () => {
  it('201 の ChatMessage を検証して返す', async () => {
    mockResponse(chatMessage, 201)

    const sent = await sendMessage('b2', 'c1', 'あしたたのしみ')

    expect(sent.id).toBe('m1')
    expect(sent.text).toBe('あしたたのしみ')
  })

  // POST の応答も検証していないと、契約と違うメッセージがそのまま
  // 楽観的追加の置き換えに使われ、描画の奥で落ちる。
  it('形が違う応答は ApiError にする', async () => {
    mockResponse({ ...chatMessage, sender: null }, 201)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      sendMessage('b2', 'c1', 'あしたたのしみ'),
    ).rejects.toBeInstanceOf(ApiError)
  })
})
