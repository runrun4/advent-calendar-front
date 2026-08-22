type MemoryItem = {
  id: number
  title: string
}

const memories: MemoryItem[] = [
  { id: 1, title: '思い出1' },
  { id: 2, title: '思い出2' },
  { id: 3, title: '思い出3' },
  { id: 4, title: '思い出4' },
  { id: 5, title: '思い出5' },
]

type MemoriesPageProps = {
  onSelectMemory?: (memory: MemoryItem) => void
}

export function MemoriesPage({ onSelectMemory }: MemoriesPageProps) {
  return (
    <div className="memories-list">
      {memories.map((memory) => (
        <button
          key={memory.id}
          type="button"
          className="memories-list__item"
          onClick={() => onSelectMemory?.(memory)}
        >
          <span className="memories-list__item-title">{memory.title}</span>
          <span className="memories-list__item-arrow" aria-hidden="true">
            »
          </span>
        </button>
      ))}
    </div>
  )
}
