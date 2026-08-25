import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './apiClient'
import { fetchMessages } from './chatService'

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

  it('形が違う応答は ApiError にする', async () => {
    mockResponse({
      messages: [{ ...chatMessage, sender: null }],
      nextCursor: null,
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(fetchMessages('b2')).rejects.toBeInstanceOf(ApiError)
  })
})
