import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import './InstallAppPrompt.css'

type InstallAppPromptProps = {
  onOpenPwaGuide?: () => void
}

function isPWA(): boolean {
  const standalone = window.matchMedia(
    '(display-mode: standalone)',
  ).matches

  const iosStandalone =
    (window.navigator as Navigator & {
      standalone?: boolean
    }).standalone === true

  return standalone || iosStandalone
}

export function InstallAppPrompt({
  onOpenPwaGuide,
}: InstallAppPromptProps) {
  const [isVisible, setIsVisible] =
    useState(false)

  useEffect(() => {
    // PWAとして起動している場合は表示しない
    if (isPWA()) {
      return
    }

    // Webブラウザの場合のみ表示
    setIsVisible(true)
  }, [])

  const handleInstall = () => {
    setIsVisible(false)

    // 既存のSplashScreenにある
    // PWA化促進画面を開く
    onOpenPwaGuide?.()
  }

  const handleContinueWeb = () => {
    setIsVisible(false)
  }

  if (!isVisible) {
    return null
  }

  return createPortal(
    <div
      className="install-app-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-app-title"
    >
      <div className="install-app-modal">
        <h2 id="install-app-title">
          アプリで利用しませんか？
        </h2>

        <p>
          アプリとして追加すると、
          <br />
          いつでも簡単にアクセスできます。
        </p>

        <button
          type="button"
          className="install-app-button"
          onClick={handleInstall}
        >
          アプリ化する
        </button>

        <button
          type="button"
          className="continue-web-button"
          onClick={handleContinueWeb}
        >
          Webのまま進める
        </button>
      </div>
    </div>,
    document.body,
  )
}