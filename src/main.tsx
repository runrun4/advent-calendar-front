import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { captureInviteTokenFromUrl } from './services/inviteToken'

// 招待リンクで開かれた場合はレンダリング前にトークンを退避し、URLを `/` に戻す。
captureInviteTokenFromUrl()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
