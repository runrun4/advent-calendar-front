import { describe, expect, it } from 'vitest'
import {
  calendarDaySummarySchema,
  eventCalendarSchema,
  eventSummarySchema,
  listEventsResponseSchema,
  openDayResponseSchema,
  openedDayContentSchema,
} from './event'

const eventSummary = {
  id: 'e1',
  name: '夏祭り',
  startDate: '2026-08-10',
  endDate: '2026-08-12',
  timezone: 'Asia/Tokyo',
  mode: 'GROUP',
  status: 'ACTIVE',
  role: 'OWNER',
  daysRemaining: 3,
  phase: 'UPCOMING',
  coverImageUrl: null,
  boardOrientation: 'PORTRAIT',
  iconId: 'calendar-days',
  boardEdited: false,
}

describe('eventSummarySchema', () => {
  it('契約どおりのイベントを受け入れる', () => {
    const parsed = eventSummarySchema.parse(eventSummary)

    expect(parsed.id).toBe('e1')
    expect(parsed.boardOrientation).toBe('PORTRAIT')
  })

  it('省略できるフィールドが無くても通る', () => {
    const { phase: _phase, coverImageUrl: _coverImageUrl, ...rest } = eventSummary
    const parsed = eventSummarySchema.parse(rest)

    expect(parsed.phase).toBeUndefined()
    expect(parsed.coverImageUrl).toBeNull()
  })

  it('サーバーが値を増やした status / phase は落とさない', () => {
    const parsed = eventSummarySchema.parse({
      ...eventSummary,
      status: 'ARCHIVED',
      phase: 'PAUSED',
    })

    expect(parsed.status).toBe('ARCHIVED')
  })

  it('必須フィールドが欠けていたら拒否する', () => {
    const { iconId: _iconId, ...rest } = eventSummary

    expect(eventSummarySchema.safeParse(rest).success).toBe(false)
  })

  it('daysRemaining が数値でなければ拒否する', () => {
    const result = eventSummarySchema.safeParse({
      ...eventSummary,
      daysRemaining: '3',
    })

    expect(result.success).toBe(false)
  })

  it('boardOrientation は契約の2値だけ受け入れる', () => {
    expect(
      eventSummarySchema.safeParse({ ...eventSummary, boardOrientation: 'SQUARE' })
        .success,
    ).toBe(false)
  })
})

describe('listEventsResponseSchema', () => {
  it('events が null / 未指定でも空配列にする', () => {
    expect(listEventsResponseSchema.parse({ events: null }).events).toEqual([])
    expect(listEventsResponseSchema.parse({}).events).toEqual([])
  })

  it('要素が契約と違えば拒否する', () => {
    const result = listEventsResponseSchema.safeParse({
      events: [{ ...eventSummary, boardEdited: 'no' }],
    })

    expect(result.success).toBe(false)
  })
})

describe('calendarDaySummarySchema', () => {
  const day = {
    id: 'd1',
    date: '2026-08-10',
    position: 1,
    state: 'AVAILABLE',
    contentKind: 'STICKER',
    isCooperationDay: true,
    openedAt: null,
  }

  it('契約どおりの日を受け入れる', () => {
    expect(calendarDaySummarySchema.parse(day).contentKind).toBe('STICKER')
  })

  it('isCooperationDay が null / 未指定なら false に寄せる', () => {
    expect(
      calendarDaySummarySchema.parse({ ...day, isCooperationDay: null })
        .isCooperationDay,
    ).toBe(false)

    const { isCooperationDay: _omitted, ...withoutFlag } = day
    expect(calendarDaySummarySchema.parse(withoutFlag).isCooperationDay).toBe(
      false,
    )
  })

  it('contentKind は契約の2値か null のみ', () => {
    expect(
      calendarDaySummarySchema.parse({ ...day, contentKind: null }).contentKind,
    ).toBeNull()
    expect(
      calendarDaySummarySchema.safeParse({ ...day, contentKind: 'PHOTO' })
        .success,
    ).toBe(false)
  })
})

describe('eventCalendarSchema', () => {
  it('入れ子のイベントが契約と違えば全体を拒否する', () => {
    const result = eventCalendarSchema.safeParse({
      event: { ...eventSummary, createdAt: '2026-08-01T00:00:00Z' },
      serverNow: '2026-08-09T12:00:00Z',
      today: '2026-08-09',
      days: [],
      todayCooperation: null,
    })

    // calendarStartDate / visibleDayCount が無い
    expect(result.success).toBe(false)
  })
})

describe('openedDayContentSchema', () => {
  it('kind で KNOWLEDGE / STICKER を出し分ける', () => {
    const knowledge = openedDayContentSchema.parse({
      kind: 'KNOWLEDGE',
      knowledgeId: 'k1',
      title: 'タイトル',
      body: '本文',
    })
    expect(knowledge.kind).toBe('KNOWLEDGE')

    const sticker = openedDayContentSchema.parse({
      kind: 'STICKER',
      sticker: {
        id: 's1',
        name: 'ねこ',
        imageUrl: 'stickers/neko.png',
        rarity: 'RARE',
        flavorText: 'ごろごろ',
        source: 'DAILY',
      },
    })
    expect(sticker.kind).toBe('STICKER')
  })

  it('kind に対して中身が噛み合わなければ拒否する', () => {
    expect(
      openedDayContentSchema.safeParse({ kind: 'STICKER', title: 'タイトル' })
        .success,
    ).toBe(false)
    expect(openedDayContentSchema.safeParse({ kind: 'PHOTO' }).success).toBe(
      false,
    )
  })
})

describe('openDayResponseSchema', () => {
  it('grant / cooperation が無い応答も受け入れる', () => {
    const parsed = openDayResponseSchema.parse({
      eventId: 'e1',
      dayId: 'd1',
      date: '2026-08-10',
      content: {
        kind: 'KNOWLEDGE',
        knowledgeId: 'k1',
        title: 'タイトル',
        body: '本文',
      },
    })

    expect(parsed.grant).toBeUndefined()
    expect(parsed.cooperation).toBeNull()
  })
})
