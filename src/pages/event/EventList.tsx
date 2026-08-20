export function EventList() {
  return (
    <div className="event-list">
      <div className="event-list__item">イベント1</div>
      <div className="event-list__item">イベント2</div>
      <div className="event-list__item">イベント3</div>
       <div className="event-list__item">イベント4</div>

      <button
        type="button"
        className="event-list__add-button"
        aria-label="イベントを追加"
      >
        ＋
      </button>
    </div>
  )
}