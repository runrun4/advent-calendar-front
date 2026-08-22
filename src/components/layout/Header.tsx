import { UserRound } from 'lucide-react'

type HeaderProps = {
  title?: string
  iconUrl?: string | null
  onOpenProfile?: () => void
}

export function Header({
  title = 'タイトル',
  iconUrl = null,
  onOpenProfile,
}: HeaderProps) {
  return (
    <header className="app-header">
      <h1 className="page-title app-header__title">{title}</h1>

      <button
        type="button"
        className="app-header__profile"
        onClick={onOpenProfile}
        aria-label="プロフィール"
      >
        {iconUrl ? (
          <img
            className="app-header__profile-image"
            src={iconUrl}
            alt=""
          />
        ) : (
          <UserRound className="app-header__profile-icon" aria-hidden="true" />
        )}
      </button>
    </header>
  )
}
