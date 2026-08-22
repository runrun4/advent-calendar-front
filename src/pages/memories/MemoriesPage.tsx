import type { BoardOrientation } from '../../services/eventApi'
import { getEventIcon } from '../event/EventNameField'

export type MemoryItem = {
  id: string
  title: string
  startDate: string
  boardOrientation: BoardOrientation
  iconId: string
  boardEdited: boolean
  mode: string
  role: string
}

const EMPTY_MEMORIES_MESSAGE = (
  <>
    終わったイベントはまだありません
    <br />
    イベントが完了するとここに表示されます
  </>
)

type MemoriesPageProps = {
  memories: MemoryItem[]
  isLoading?: boolean
  onSelectMemory?: (memory: MemoryItem) => void
}

export function MemoriesPage({
  memories,
  isLoading = false,
  onSelectMemory,
}: MemoriesPageProps) {
  return (
    <div className="memories-list">
      {isLoading ? (
        <p className="memories-list__status">読み込み中…</p>
      ) : null}

      {!isLoading && memories.length === 0 ? (
        <p className="memories-list__status">{EMPTY_MEMORIES_MESSAGE}</p>
      ) : null}

      {memories.map((memory) => {
        const Icon = getEventIcon(memory.iconId)

        return (
          <button
            key={memory.id}
            type="button"
            className="memories-list__item"
            onClick={() => onSelectMemory?.(memory)}
          >
            <span className="memories-list__item-icon" aria-hidden="true">
              <Icon size={22} strokeWidth={2} />
            </span>

            <span className="memories-list__item-title">{memory.title}</span>
            <span className="memories-list__item-arrow" aria-hidden="true">
              »
            </span>
          </button>
        )
      })}
    </div>
  )
}
