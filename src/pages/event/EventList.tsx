import { ScreenShell } from '../../components/layout/ScreenShell'

type EventListProps = {
  onOpenDetail?: () => void
}

export function EventList({ onOpenDetail }: EventListProps) {
  return (
    <ScreenShell
      title="イベント一覧の画面です"
      showBack={false}
      embedded
      onNext={onOpenDetail}
    />
  )
}
