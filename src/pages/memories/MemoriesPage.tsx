import type { CSSProperties } from 'react'

type MemoryItem = {
  id: number
  title: string
  color: string
}

const memories: MemoryItem[] = [
  {
    id: 1,
    title: '思い出1',
    color: '#B8E0D2',
  },
  {
    id: 2,
    title: '思い出2',
    color: '#A9DEF9',
  },
  {
    id: 3,
    title: '思い出3',
    color: '#E4C1F9',
  },
  {
    id: 4,
    title: '思い出4',
    color: '#F9C7BE',
  }
]

export function MemoriesPage() {
  return (
    <div className="memories-list">
      {memories.map((memory) => {
        const style = {
          '--memory-color': memory.color,
        } as CSSProperties

        return (
          <button
            key={memory.id}
            type="button"
            className="memories-list__item"
            style={style}
          >
            <span className="memories-list__item-title">
              {memory.title}
            </span>
          <span
            className="memories-list__item-arrow"
            aria-hidden="true"
          >
          »
        </span>
          </button>
        )
      })}

      <button
        type="button"
        className="memories-list__add-button"
        aria-label="思い出を追加"
      >
        ＋
      </button>
    </div>
  )
}