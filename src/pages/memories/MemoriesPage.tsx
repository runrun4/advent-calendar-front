export function MemoriesPage() {
  return (
    <div className="memories-list">
      <div className="memories-list__item">思い出1</div>
      <div className="memories-list__item">思い出2</div>

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