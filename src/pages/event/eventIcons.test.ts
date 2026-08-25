import { CalendarDays, Music } from 'lucide-react'
import { describe, expect, it } from 'vitest'

import { DEFAULT_EVENT_ICON, EVENT_ICON_MAP } from './eventIcons'

describe('EVENT_ICON_MAP', () => {
  it('登録済み id は対応するアイコンを返す', () => {
    expect(EVENT_ICON_MAP['calendar-days']).toBe(CalendarDays)
    expect(EVENT_ICON_MAP['music']).toBe(Music)
  })

  it('未知の id はフォールバックに落ちる', () => {
    expect(EVENT_ICON_MAP['unknown-id'] ?? DEFAULT_EVENT_ICON).toBe(DEFAULT_EVENT_ICON)
    expect(EVENT_ICON_MAP[''] ?? DEFAULT_EVENT_ICON).toBe(DEFAULT_EVENT_ICON)
  })

  it('prototype 上のキーを拾わない(iconId はサーバー値がそのまま来る)', () => {
    for (const key of ['__proto__', 'toString', 'constructor', 'hasOwnProperty', 'valueOf']) {
      expect(EVENT_ICON_MAP[key] ?? DEFAULT_EVENT_ICON).toBe(DEFAULT_EVENT_ICON)
    }
  })
})
