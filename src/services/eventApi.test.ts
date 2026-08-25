import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './apiClient'
import { createEvent } from './eventApi'

vi.mock('./authService', () => ({
  getAccessToken: async () => 'test-token',
}))

/** POST /v1/events が返す形(eventDetailResponse)。 */
const eventDetail = {
  id: '00000000-0000-4000-8000-0000000000b2',
  name: '夏祭り',
  startDate: '2026-08-10',
  endDate: '2026-08-12',
  timezone: 'Asia/Tokyo',
  mode: 'PERSONAL',
  status: 'ACTIVE',
  role: 'OWNER',
  daysRemaining: 3,
  phase: 'UPCOMING',
  boardOrientation: 'PORTRAIT',
  iconId: 'calendar-days',
  boardEdited: false,
  coverImageUrl: null,
  createdAt: '2026-08-07T09:00:00Z',
  calendarStartDate: '2026-08-07',
  visibleDayCount: 6,
  groupId: null,
}

const createInput = {
  name: '夏祭り',
  startDate: '2026-08-10',
  endDate: '2026-08-12',
  countdownDays: 3,
  mode: 'PERSONAL' as const,
}

function mockResponse(body: unknown, status = 201) {
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

describe('createEvent', () => {
  it('201 の EventDetail を検証して返す', async () => {
    mockResponse(eventDetail)

    const created = await createEvent(createInput)

    expect(created.id).toBe(eventDetail.id)
    // EventSummary には無い EventDetail のフィールドまで受け取れる。
    expect(created.calendarStartDate).toBe('2026-08-07')
    expect(created.visibleDayCount).toBe(6)
  })

  it('EventDetail のフィールドが欠けていたら ApiError にする', async () => {
    const { visibleDayCount: _visibleDayCount, ...summaryOnly } = eventDetail
    mockResponse(summaryOnly)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(createEvent(createInput)).rejects.toBeInstanceOf(ApiError)
  })
})
