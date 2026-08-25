import { describe, expect, it } from 'vitest'
import {
  calendarDaySummarySchema,
  eventBestShotsSchema,
  eventCalendarSchema,
  eventCollectionsSchema,
  eventMembersResponseSchema,
  eventSummarySchema,
  invitationSchema,
  listEventsResponseSchema,
  openDayResponseSchema,
  openedDayContentSchema,
  openedDayResponseSchema,
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

/**
 * 以下の fixture は runrun-backend の実装が実際に書き出す形に合わせてある。
 * 正本は `docs/api/openapi.yaml` と `internal/httpapi/*.go`(calendarResponse /
 * membersResponse / collectionsResponse / bestShotsResponse / invitationResponse)。
 * 「契約どおりの応答をスキーマが拒まない」ことを固定するのがここの狙いで、
 * 拒否側の網は各 describe の既存テストが張っている。
 */

// Go の userResponse。avatarUrl は null になりうる。
const apiUser = {
  id: '8d5cbb42-6a2b-4be8-9c8a-000000000001',
  displayName: 'はせがわ',
  avatarUrl: null,
}

describe('eventCalendarSchema', () => {
  // GET /v1/events/{eventId}/calendar が返す形(calendarResponse)。
  const calendarResponse = {
    event: {
      ...eventSummary,
      id: '00000000-0000-4000-8000-0000000000b2',
      phase: 'ONGOING',
      daysRemaining: 1,
      createdAt: '2026-08-01T02:03:04Z',
      calendarStartDate: '2026-08-07',
      visibleDayCount: 4,
      groupId: null,
    },
    serverNow: '2026-08-09T03:00:00Z',
    today: '2026-08-09',
    days: [
      {
        id: '00000000-0000-4000-8000-0000000000d1',
        date: '2026-08-07',
        position: 1,
        state: 'OPENED',
        contentKind: 'KNOWLEDGE',
        isCooperationDay: false,
        openedAt: '2026-08-07T22:15:00Z',
      },
      {
        id: '00000000-0000-4000-8000-0000000000d2',
        date: '2026-08-08',
        position: 2,
        state: 'EXPIRED',
        contentKind: 'STICKER',
        isCooperationDay: true,
        openedAt: null,
      },
      {
        id: '00000000-0000-4000-8000-0000000000d3',
        date: '2026-08-09',
        position: 3,
        state: 'AVAILABLE',
        contentKind: null,
        isCooperationDay: false,
        openedAt: null,
      },
      {
        // 未来日は種別も協力デイかどうかも伏せる。
        id: '00000000-0000-4000-8000-0000000000d4',
        date: '2026-08-10',
        position: 4,
        state: 'LOCKED',
        contentKind: null,
        isCooperationDay: null,
        openedAt: null,
      },
    ],
    // 本日が協力デイでなければ null。
    todayCooperation: null,
  }

  it('バックエンドが返すカレンダーをそのまま受け入れる', () => {
    const parsed = eventCalendarSchema.parse(calendarResponse)

    expect(parsed.event.calendarStartDate).toBe('2026-08-07')
    expect(parsed.event.visibleDayCount).toBe(4)
    expect(parsed.days).toHaveLength(4)
    expect(parsed.days[0].openedAt).toBe('2026-08-07T22:15:00Z')
    expect(parsed.days[2].contentKind).toBeNull()
    // 未来日の isCooperationDay(null)は false に丸める。
    expect(parsed.days[3].isCooperationDay).toBe(false)
    expect(parsed.todayCooperation).toBeNull()
  })

  it('協力デイの進捗が入ったカレンダーも受け入れる', () => {
    const parsed = eventCalendarSchema.parse({
      ...calendarResponse,
      todayCooperation: {
        status: 'IN_PROGRESS',
        openedCount: 2,
        requiredCount: 3,
        achievedAt: null,
      },
    })

    expect(parsed.todayCooperation).toEqual({
      status: 'IN_PROGRESS',
      openedCount: 2,
      requiredCount: 3,
      achievedAt: null,
    })
  })

  it('days が null でも空配列にする', () => {
    expect(eventCalendarSchema.parse({ ...calendarResponse, days: null }).days).toEqual(
      [],
    )
  })

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

describe('eventMembersResponseSchema', () => {
  // GET /v1/events/{eventId}/members が返す形(membersResponse)。
  const membersResponse = {
    eventId: '00000000-0000-4000-8000-0000000000b2',
    members: [
      {
        user: apiUser,
        role: 'OWNER',
        joinedAt: '2026-08-01T02:03:04Z',
        openedToday: true,
      },
      {
        user: {
          id: '8d5cbb42-6a2b-4be8-9c8a-000000000002',
          displayName: 'ゲスト',
          avatarUrl: 'https://example.test/avatars/2.png',
        },
        role: 'MEMBER',
        joinedAt: '2026-08-02T10:00:00Z',
        // 本日のマスが無ければ null。
        openedToday: null,
      },
    ],
    todayCooperation: {
      status: 'ACHIEVED',
      openedCount: 2,
      requiredCount: 2,
      achievedAt: '2026-08-08T09:00:00Z',
    },
  }

  it('バックエンドが返すメンバー一覧をそのまま受け入れる', () => {
    const parsed = eventMembersResponseSchema.parse(membersResponse)

    expect(parsed.members).toHaveLength(2)
    expect(parsed.members[0].openedToday).toBe(true)
    expect(parsed.members[1].openedToday).toBeNull()
    expect(parsed.members[1].user.avatarUrl).toBe('https://example.test/avatars/2.png')
    expect(parsed.todayCooperation?.status).toBe('ACHIEVED')
  })

  it('members が null でも空配列にする', () => {
    expect(
      eventMembersResponseSchema.parse({ ...membersResponse, members: null }).members,
    ).toEqual([])
  })
})

describe('eventCollectionsSchema', () => {
  // GET /v1/events/{eventId}/collections が返す形(collectionsResponse)。
  const collectionsResponse = {
    eventId: '00000000-0000-4000-8000-0000000000b2',
    knowledgeCards: [
      {
        grantId: '00000000-0000-4000-8000-0000000000g1',
        grantedAt: '2026-08-07T22:15:00Z',
        dayId: '00000000-0000-4000-8000-0000000000d1',
        content: {
          kind: 'KNOWLEDGE',
          knowledgeId: '00000000-0000-4000-8000-0000000000k1',
          title: '花火の豆知識',
          body: '玉の大きさで開く直径が変わる。',
          imageUrl: null,
          category: null,
        },
      },
    ],
    stickers: [
      {
        grantId: '00000000-0000-4000-8000-0000000000g2',
        grantedAt: '2026-08-08T09:00:00Z',
        source: 'COOPERATION',
        dayId: '00000000-0000-4000-8000-0000000000d2',
        sticker: {
          id: '00000000-0000-4000-8000-0000000000s1',
          name: 'ねこ',
          imageUrl: 'https://example.test/stickers/neko.png',
          rarity: 'DELUXE',
          flavorText: 'ごろごろ',
          source: 'COOPERATION',
          eventName: '夏祭り',
          eventDate: '2026-08-08',
        },
      },
    ],
  }

  it('バックエンドが返すコレクションをそのまま受け入れる', () => {
    const parsed = eventCollectionsSchema.parse(collectionsResponse)

    expect(parsed.stickers).toHaveLength(1)
    expect(parsed.stickers[0].sticker.rarity).toBe('DELUXE')
    expect(parsed.stickers[0].dayId).toBe('00000000-0000-4000-8000-0000000000d2')
    // ナレッジカードは画面が未実装なので中身は素通しする。
    expect(parsed.knowledgeCards).toHaveLength(1)
  })

  it('一覧が null でも空配列にする', () => {
    const parsed = eventCollectionsSchema.parse({
      eventId: '00000000-0000-4000-8000-0000000000b2',
      knowledgeCards: null,
      stickers: null,
    })

    expect(parsed.knowledgeCards).toEqual([])
    expect(parsed.stickers).toEqual([])
  })
})

describe('eventBestShotsSchema', () => {
  // GET /v1/events/{eventId}/best-shots が返す形(bestShotsResponse)。
  // imagePath はサーバーが返さないので fixture にも入れない。
  const bestShotsResponse = {
    eventId: '00000000-0000-4000-8000-0000000000b2',
    shots: [
      {
        id: '00000000-0000-4000-8000-0000000000f1',
        user: apiUser,
        imageUrl:
          'https://example.test/storage/v1/object/public/best-shots/00000000-0000-4000-8000-0000000000b2/8d5cbb42-6a2b-4be8-9c8a-000000000001/shot.jpg',
        createdAt: '2026-08-08T09:00:00Z',
        updatedAt: '2026-08-08T09:30:00Z',
      },
    ],
  }

  it('バックエンドが返すベストショットをそのまま受け入れる', () => {
    const parsed = eventBestShotsSchema.parse(bestShotsResponse)

    expect(parsed.shots).toHaveLength(1)
    expect(parsed.shots[0].imagePath).toBeUndefined()
    expect(parsed.shots[0].user.avatarUrl).toBeNull()
  })

  it('shots が null でも空配列にする', () => {
    expect(
      eventBestShotsSchema.parse({ ...bestShotsResponse, shots: null }).shots,
    ).toEqual([])
  })
})

describe('invitationSchema', () => {
  it('バックエンドが返す招待をそのまま受け入れる', () => {
    // POST /v1/events/{eventId}/invitations が返す形(invitationResponse)。
    const parsed = invitationSchema.parse({
      id: '00000000-0000-4000-8000-0000000000i1',
      eventId: '00000000-0000-4000-8000-0000000000b2',
      token: 'BQ1x9pQ7Tn4kZm2rLd8vYaHc0sJfWuEoNbXgKiPtRzA',
      expiresAt: '2026-08-10T03:00:00Z',
      inviteUrl:
        'https://example.test/invite/BQ1x9pQ7Tn4kZm2rLd8vYaHc0sJfWuEoNbXgKiPtRzA',
    })

    expect(parsed.token).toBe('BQ1x9pQ7Tn4kZm2rLd8vYaHc0sJfWuEoNbXgKiPtRzA')
    expect(parsed.inviteUrl).toContain('/invite/')
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

describe('openedDayResponseSchema', () => {
  it('opening / navigation を含む応答も受け入れる(画面が読まないので落とす)', () => {
    // GET /v1/events/{eventId}/days/{dayId} が返す形(openedDayResponse)。
    // opening と navigation は契約上 required だが画面が使っていないので、
    // スキーマに写していない = parse 結果からは落ちる。
    const parsed = openedDayResponseSchema.parse({
      eventId: '00000000-0000-4000-8000-0000000000b2',
      dayId: '00000000-0000-4000-8000-0000000000d1',
      date: '2026-08-07',
      opening: {
        id: '00000000-0000-4000-8000-0000000000o1',
        dayId: '00000000-0000-4000-8000-0000000000d1',
        openedAt: '2026-08-07T22:15:00Z',
        contentVersion: 1,
      },
      content: {
        kind: 'KNOWLEDGE',
        knowledgeId: '00000000-0000-4000-8000-0000000000k1',
        title: '花火の豆知識',
        body: '玉の大きさで開く直径が変わる。',
        imageUrl: null,
        category: null,
      },
      navigation: {
        previousDayId: null,
        nextDayId: '00000000-0000-4000-8000-0000000000d2',
      },
    })

    expect(parsed.content.kind).toBe('KNOWLEDGE')
    expect(parsed).not.toHaveProperty('opening')
    expect(parsed).not.toHaveProperty('navigation')
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
