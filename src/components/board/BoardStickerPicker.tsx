import type { CollectedSticker } from '../../services/eventApi'

type BoardStickerPickerProps = {
  stickers: CollectedSticker[]
  isLoading: boolean
  errorMessage: string | null
  selectedStickerId: string | null
  onSelect: (sticker: CollectedSticker) => void
}

/** 獲得済みステッカーから貼るものを1つ選ぶ横スクロールのリスト。 */
export function BoardStickerPicker({
  stickers,
  isLoading,
  errorMessage,
  selectedStickerId,
  onSelect,
}: BoardStickerPickerProps) {
  if (isLoading) {
    return <p className="board-picker__status">ステッカーを読み込み中…</p>
  }

  if (errorMessage) {
    return (
      <p className="board-picker__status board-picker__status--error">
        {errorMessage}
      </p>
    )
  }

  if (stickers.length === 0) {
    return (
      <p className="board-picker__status">
        まだステッカーがありません。カレンダーを開いて集めよう。
      </p>
    )
  }

  return (
    <ul className="board-picker__list">
      {stickers.map((collected) => {
        const isSelected = collected.sticker.id === selectedStickerId

        return (
          <li key={collected.grantId}>
            <button
              type="button"
              className={`board-picker__item${
                isSelected ? ' board-picker__item--selected' : ''
              }`}
              aria-pressed={isSelected}
              aria-label={collected.sticker.name}
              onClick={() => onSelect(collected)}
            >
              {collected.sticker.imageUrl ? (
                <img
                  src={collected.sticker.imageUrl}
                  alt=""
                  className="board-picker__image"
                />
              ) : (
                <span className="board-picker__placeholder" aria-hidden="true" />
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
