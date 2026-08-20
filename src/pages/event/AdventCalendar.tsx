type AdventCalendarProps = {
  title?: string
  onBack?: () => void
}

export function AdventCalendar({
  title = 'アドベントカレンダー',
  onBack,
}: AdventCalendarProps) {
  return (
    <section className="advent-calendar-page" aria-label={title}>
      <header className="advent-calendar-page__header">
        <button
          type="button"
          className="advent-calendar-page__back"
          onClick={onBack}
          aria-label="戻る"
        >
          ← 戻る
        </button>
        <h1 className="advent-calendar-page__title">{title}</h1>
      </header>

      <div className="advent-calendar-page__body">
        <p className="advent-calendar-page__label">
          このページはアドベントカレンダーのページです
        </p>
      </div>
    </section>
  )
}
