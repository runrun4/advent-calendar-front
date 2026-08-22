import { UserRound } from 'lucide-react'
import appIcon from '../../assets/appicon.jpg'

type HeaderProps = {
  title?: string
  iconUrl?: string | null
  onOpenProfile?: () => void
}

export function Header({
  title = 'mekulunlun',
  iconUrl = null,
  onOpenProfile,
}: HeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <img
          className="app-header__app-icon"
          src={appIcon}
          alt="mekulunlun"
        />

        <h1 className="page-title app-header__title">{title}</h1>
      </div>

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
          <UserRound
            className="app-header__profile-icon"
            aria-hidden="true"
          />
        )}
      </button>
    </header>
  )
}