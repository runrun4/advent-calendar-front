type CalendarAddButtonProps = {
  onClick?: () => void
}

export function CalendarAddButton({ onClick }: CalendarAddButtonProps) {
  return (
    <div className="private-calendar-page-addbutton-area">
      <button
        type="button"
        className="private-calendar-page-addbutton-button"
        aria-label="予定を追加"
        onClick={onClick}
      >
        +
      </button>
    </div>
  )
}
