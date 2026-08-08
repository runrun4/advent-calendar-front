type HeaderProps = {
  onOpenProfile?: () => void
}

export function Header({ onOpenProfile }: HeaderProps) {
  return (
    <header className="app-header">
      <button
        type="button"
        className="app-header__profile"
        onClick={onOpenProfile}
        aria-label="プロフィール"
      >
        プロフィール
      </button>
    </header>
  )
}
