import { describe, expect, it } from 'vitest'
import { resolveBestShotImagePath } from './bestShotImagePath'
import type { BestShot } from '../../services/eventApi'

const EVENT_ID = '00000000-0000-4000-8000-0000000000b2'
const STORAGE_PATH = `${EVENT_ID}/8d5cbb42-6a2b-4be8-9c8a-000000000001/shot.jpg`

function bestShot(overrides: Partial<BestShot>): BestShot {
  return {
    id: '00000000-0000-4000-8000-0000000000f1',
    user: {
      id: '00000000-0000-4000-8000-000000000001',
      displayName: 'たろう',
      avatarUrl: null,
    },
    imageUrl: `https://example.test/storage/v1/object/public/best-shots/${STORAGE_PATH}`,
    createdAt: '2026-08-08T09:00:00Z',
    updatedAt: '2026-08-08T09:30:00Z',
    ...overrides,
  }
}

describe('resolveBestShotImagePath', () => {
  it('imagePath があればそれをそのまま使う', () => {
    const shot = bestShot({ imagePath: `${EVENT_ID}/from-server/shot.jpg` })

    expect(resolveBestShotImagePath(shot)).toBe(`${EVENT_ID}/from-server/shot.jpg`)
  })

  it('imagePath が無ければ imageUrl から逆算する', () => {
    expect(resolveBestShotImagePath(bestShot({}))).toBe(STORAGE_PATH)
  })

  it('imagePath が無く imageUrl も想定の形でなければ空文字を返す', () => {
    const shot = bestShot({ imageUrl: 'https://example.test/other/shot.jpg' })

    expect(resolveBestShotImagePath(shot)).toBe('')
  })
})
