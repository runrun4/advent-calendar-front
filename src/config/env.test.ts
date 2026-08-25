import { afterEach, describe, expect, it, vi } from 'vitest'
import { getApiBaseUrl, getEnv } from './env'

afterEach(() => {
  vi.unstubAllEnvs()
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
})
