import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getApiBaseUrl, getEnv, resetEnvCache } from './env'

// getEnv / getApiBaseUrl は初回の評価結果をキャッシュするので、
// stubEnv で環境変数を差し替えるテストでは毎回捨てる。
beforeEach(() => {
  resetEnvCache()
})

afterEach(() => {
  vi.unstubAllEnvs()
  resetEnvCache()
})

describe('getEnv', () => {
  it('VITE_API_BASE_URL を読む', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test')

    expect(getEnv().VITE_API_BASE_URL).toBe('https://api.example.test')
  })

  it('未設定なら空文字にする(相対パスで叩く)', () => {
    vi.stubEnv('VITE_API_BASE_URL', undefined)

    expect(getEnv().VITE_API_BASE_URL).toBe('')
  })
})

describe('getApiBaseUrl', () => {
  it('末尾のスラッシュを落とす', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test/')

    expect(getApiBaseUrl()).toBe('https://api.example.test')
  })

  it('未設定なら空文字を返す', () => {
    vi.stubEnv('VITE_API_BASE_URL', '')

    expect(getApiBaseUrl()).toBe('')
  })

  it('2回目以降は再評価せずキャッシュを返す', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test')
    expect(getApiBaseUrl()).toBe('https://api.example.test')

    // 環境変数はビルド時に固定されるので、実行中に変わっても読み直さない。
    vi.stubEnv('VITE_API_BASE_URL', 'https://other.example.test')
    expect(getApiBaseUrl()).toBe('https://api.example.test')

    resetEnvCache()
    expect(getApiBaseUrl()).toBe('https://other.example.test')
  })
})
