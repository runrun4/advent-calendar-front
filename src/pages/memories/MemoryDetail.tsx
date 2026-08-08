import { ScreenShell } from '../../components/layout/ScreenShell'

type MemoryDetailProps = {
  onBack?: () => void
}

export function MemoryDetail({ onBack }: MemoryDetailProps) {
  return (
    <ScreenShell
      title="思い出詳細の画面です"
      embedded
      onBack={onBack}
    />
  )
}
