import { Component, type ErrorInfo, type ReactNode } from 'react'
import './ErrorBoundary.css'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

/*
 * レンダー中の例外を受け止める。
 *
 * 受け止めないと React がツリーごと外してしまい、
 * 利用者には真っ白な画面だけが残る。
 * エラー境界は今のところクラスコンポーネントでしか書けない。
 *
 * 注意: 捕捉できるのはレンダー中と lifecycle 内の throw だけ。
 * イベントハンドラ・setTimeout・Promise の中の例外はここに来ない。
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error('Unhandled error in render', error, errorInfo)
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="error-boundary">
        <div className="error-boundary__panel" role="alert">
          <h1 className="error-boundary__title">問題が発生しました</h1>

          <p className="error-boundary__message">
            画面の表示中にエラーが起きました。
            <br />
            再読み込みしてもう一度お試しください。
          </p>

          <button
            type="button"
            className="error-boundary__reload"
            onClick={() => window.location.reload()}
          >
            再読み込み
          </button>
        </div>
      </div>
    )
  }
}
