import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import './InstallAppPrompt.css'

type InstallAppPromptProps = {
  isActive: boolean
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
  isActive,
}: InstallAppPromptProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // イベント画面ではない場合は非表示
    if (!isActive) {
      setIsVisible(false)
      return
    }

    // PWAとして起動している場合は表示しない
    if (isPWA()) {
      setIsVisible(false)
      return
    }

    // イベント画面を開いたら表示
    setIsVisible(true)
  }, [isActive])

  const handleClose = () => {
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
        <button
          type="button"
          className="install-app-close"
          onClick={handleClose}
          aria-label="閉じる"
        >
          ×
        </button>

        <h2 id="install-app-title">
          アプリとして利用しませんか？
        </h2>

        <p className="install-app-description">
          ホーム画面に追加すると、
          <br />
          アプリとして簡単にアクセスできます。
        </p>

        <div className="install-app-steps">
          <div className="install-app-step">
            <span className="install-app-step-number">
              1
            </span>

            <div className="install-app-step-content">
              <strong>
                ブラウザのメニューを開く
              </strong>

              <p>
                画面右上またはブラウザのメニューから
                <br />
                メニューを開いてください。
              </p>
            </div>
          </div>

          <div className="install-app-step">
            <span className="install-app-step-number">
              2
            </span>

            <div className="install-app-step-content">
              <strong>
                「ホーム画面に追加」を選択
              </strong>

              <p>
                「ホーム画面に追加」や
                <br />
                「アプリをインストール」を
                選択してください。
              </p>
            </div>
          </div>

          <div className="install-app-step">
            <span className="install-app-step-number">
              3
            </span>

            <div className="install-app-step-content">
              <strong>
                ホーム画面から起動
              </strong>

              <p>
                追加されたアイコンから起動すると、
                <br />
                アプリとして利用できます。
              </p>
            </div>
          </div>
        </div>

        <p className="install-app-note">
          ※ ブラウザによって表示される項目名や
          <br />
          操作方法が異なる場合があります。
        </p>
      </div>
    </div>,
    document.body,
  )
}