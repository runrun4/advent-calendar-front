import { ScreenShell } from '../../components/layout/ScreenShell'

type InitialSetupProps = {
  onComplete?: () => void
  onBack?: () => void
}

export function InitialSetup({ onComplete, onBack }: InitialSetupProps) {
  return (
    <ScreenShell
      title="初回セットアップの画面です"
      onNext={onComplete}
      onBack={onBack}
    />
  )
}
