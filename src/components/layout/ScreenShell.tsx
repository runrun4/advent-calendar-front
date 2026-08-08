type ScreenShellProps = {
  title: string
  onNext?: () => void
  onBack?: () => void
  showBack?: boolean
  embedded?: boolean
}

export function ScreenShell({
  title,
  onNext,
  onBack,
  showBack = true,
  embedded = false,
}: ScreenShellProps) {
  return (
    <section
      className={`screen-shell${embedded ? ' screen-shell--embedded' : ''}`}
      aria-label={title}
    >
      {showBack ? (
        <button
          type="button"
          className="screen-shell__back"
          onClick={onBack}
          aria-label="戻る"
        >
          ← 戻る
        </button>
      ) : null}

      {onNext ? (
        <button type="button" className="screen-shell__next" onClick={onNext}>
          {title}
        </button>
      ) : (
        <p className="screen-shell__label">{title}</p>
      )}
    </section>
  )
}
