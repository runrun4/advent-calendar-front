import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

/**
 * React Testing Library / jsdom / jest-dom が動くことを確かめる最小のテスト。
 * コンポーネントのテストを書き足すときの雛形も兼ねる。
 */
describe('Button', () => {
  it('children を表示する', () => {
    render(<Button>送信</Button>)

    expect(screen.getByRole('button', { name: '送信' })).toBeInTheDocument()
  })

  it('type を指定しなければ button になる(フォームの誤送信を防ぐ)', () => {
    render(<Button>送信</Button>)

    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('type を明示すれば上書きできる', () => {
    render(<Button type="submit">送信</Button>)

    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('クリックで onClick が呼ばれる', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>送信</Button>)

    await userEvent.click(screen.getByRole('button'))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('disabled のときはクリックされない', async () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} disabled>
        送信
      </Button>,
    )

    await userEvent.click(screen.getByRole('button'))

    expect(onClick).not.toHaveBeenCalled()
  })
})
