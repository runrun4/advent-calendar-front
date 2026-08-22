import { useState } from 'react'
import {
  Camera,
  ChevronLeft,
  Eraser,
  Pencil,
  Sticker,
} from 'lucide-react'
import type { BoardOrientation } from '../../services/eventApi'
import './BoardEditPage.css'

type BoardEditPageProps = {
  boardOrientation?: BoardOrientation
  onBack: () => void
}

type Tool = 'pen' | 'eraser' | 'sticker' | 'camera'

function boardCanvasClass(orientation?: BoardOrientation): string {
  return orientation === 'LANDSCAPE'
    ? 'board-edit__canvas--landscape'
    : 'board-edit__canvas--portrait'
}

export function BoardEditPage({
  boardOrientation = 'PORTRAIT',
  onBack,
}: BoardEditPageProps) {
  const [activeTool, setActiveTool] = useState<Tool>('pen')

  const tools: { id: Tool; label: string; icon: typeof Pencil }[] = [
    { id: 'pen', label: 'ペン', icon: Pencil },
    { id: 'eraser', label: '消しゴム', icon: Eraser },
    { id: 'sticker', label: 'ステッカー', icon: Sticker },
    { id: 'camera', label: 'カメラ', icon: Camera },
  ]

  return (
    <div className="board-edit">
      <header className="board-edit__header">
        <button
          type="button"
          className="board-edit__back-button"
          onClick={onBack}
          aria-label="戻る"
        >
          <ChevronLeft size={28} strokeWidth={2} />
        </button>
        <h1 className="board-edit__title">編集</h1>
      </header>

      <main className="board-edit__main">
        <div
          className={`board-edit__canvas ${boardCanvasClass(boardOrientation)}`}
          role="img"
          aria-label="イベントボード"
        />
      </main>

      <footer className="board-edit__toolbar">
        {tools.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`board-edit__tool-button${
              activeTool === id ? ' board-edit__tool-button--active' : ''
            }`}
            aria-label={label}
            aria-pressed={activeTool === id}
            onClick={() => setActiveTool(id)}
          >
            <Icon size={22} strokeWidth={2} />
          </button>
        ))}
      </footer>
    </div>
  )
}
