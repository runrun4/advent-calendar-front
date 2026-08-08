import { ScreenShell } from '../../components/layout/ScreenShell'

type EventDetailProps = {
  onBack?: () => void
}

export function EventDetail({ onBack }: EventDetailProps) {
  return (
    <ScreenShell
      title="イベント詳細の画面です"
      embedded
      onBack={onBack}
    />
  )
}
