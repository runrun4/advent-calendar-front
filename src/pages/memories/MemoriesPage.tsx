import { useState } from 'react'
import { ScreenShell } from '../../components/layout/ScreenShell'
import { MemoryDetail } from './MemoryDetail'

export function MemoriesPage() {
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  if (isDetailOpen) {
    return <MemoryDetail onBack={() => setIsDetailOpen(false)} />
  }

  return (
    <ScreenShell
      title="思い出の画面です"
      showBack={false}
      embedded
      onNext={() => setIsDetailOpen(true)}
    />
  )
}
