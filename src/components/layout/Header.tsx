type HeaderProps = {
  onOpenProfile?: () => void
}

export function Header({ onOpenProfile }: HeaderProps) {
  return (
    <header className="app-header">
      <h1 className="page-title app-header__title">
  EVENT
</h1>

      <button
        type="button"
        className="app-header__profile"
        onClick={onOpenProfile}
        aria-label="プロフィール"
      >
        <span className="app-header__profile-icon" aria-hidden="true">
          👤
        </span>
      </button>
    </header>
  )
}