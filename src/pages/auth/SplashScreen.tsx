import { useEffect, useState } from 'react'
import './SplashScreen.css'

type SplashScreenProps = {
  onLoadingComplete?: () => void
  onWebContinue?: () => void
}

function detectPWA(): boolean {
  const standalone = window.matchMedia(
    '(display-mode: standalone)',
  ).matches

  const iosStandalone =
    'standalone' in navigator &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true

  return standalone || iosStandalone
}

export function SplashScreen({
  onLoadingComplete,
  onWebContinue,
}: SplashScreenProps) {
  /*
   * PWA判定はマウント時に一度だけ行えば十分なので、
   * useState の遅延初期化で済ませる。
   */
  const [isPWA] = useState(detectPWA)

  /*
   * PWA化済みの場合のみ、
   * 2秒後に次の画面へ進む
   */
  useEffect(() => {
    if (!isPWA) {
      return
    }

    const timer = window.setTimeout(() => {
      onLoadingComplete?.()
    }, 2000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [isPWA, onLoadingComplete])

  // ================================
  // PWA化済み
  // ================================
  if (isPWA) {
    return (
      <div className="splash-screen">
        <div className="splash-pwa-welcome">
          <p className="splash-pwa-title">
            ようこそ！
          </p>

          <p className="splash-pwa-product">
            <span className="splash-pwa-product-name">
              めくるんるん
            </span>
            へ
          </p>

          <div className="splash-pwa-description">
            <p>めくるんるんは</p>
            <p>あなたの予定管理を</p>
            <p>楽しくサポートします</p>
          </div>

          <div className="splash-pwa-loading">
            <p className="splash-pwa-loading-text">
              loading
            </p>

            <div className="splash-pwa-loading-dots">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ================================
  // PWA化されていない
  // ================================
  return (
    <div className="splash-screen">
      <div className="splash-welcome">
        <p className="splash-title">
          ようこそ！
        </p>

        <p className="splash-product">
          <span className="splash-product-name">
            めくるんるん
          </span>
          へ
        </p>

        <div className="pwa-guide">
          <div className="pwa-guide__content">
            <p className="pwa-guide__title">
              ＞アプリアイコンをホーム画面に
              <br />
              追加してください。
            </p>

            <ol className="pwa-guide__steps">
              <li>
                <span>右下の・・・をタップ</span>
              </li>

              <li>
                <span>
                  <span className="pwa-guide__underline">
                    共有
                  </span>
                  を選択
                </span>
              </li>

              <li>
                <span>
                  ＞
                  <span className="pwa-guide__underline">
                    表示画面を増やす
                  </span>
                  を選択
                </span>
              </li>

              <li>
                <span>
                  <span className="pwa-guide__underline">
                    ホーム画面に追加
                  </span>
                  を選択
                </span>
              </li>
            </ol>
          </div>
        </div>

        <button
          type="button"
          className="web-continue"
          onClick={onWebContinue}
        >
          webのまま進める
        </button>
      </div>
    </div>
  )
}
