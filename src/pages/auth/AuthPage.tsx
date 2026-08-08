import { ScreenShell } from '../../components/layout/ScreenShell'

type AuthPageProps = {
  onAuthenticated?: () => void
  onBack?: () => void
}

export function AuthPage({ onAuthenticated, onBack }: AuthPageProps) {
  return (
    <ScreenShell
      title="ログインの画面です"
      onNext={onAuthenticated}
      onBack={onBack}
    />
  )
}
