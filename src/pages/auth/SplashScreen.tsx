import { ScreenShell } from '../../components/layout/ScreenShell'

type SplashScreenProps = {
  onFinished?: () => void
}

export function SplashScreen({ onFinished }: SplashScreenProps) {
  return (
    <ScreenShell
      title="スプラッシュの画面です"
      showBack={false}
      onNext={onFinished}
    />
  )
}
