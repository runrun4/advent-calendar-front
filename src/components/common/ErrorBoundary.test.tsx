import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

function Boom(): never {
  throw new Error('render failed')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React とエラー境界自身が例外を console.error に出すので、出力を抑える。
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('例外が起きなければ子をそのまま描画する', () => {
    render(
      <ErrorBoundary>
        <p>本文</p>
      </ErrorBoundary>,
    )

    expect(screen.getByText('本文')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('子がレンダー中に throw したらフォールバックを表示する', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('問題が発生しました')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '再読み込み' }),
    ).toBeInTheDocument()
  })
})
