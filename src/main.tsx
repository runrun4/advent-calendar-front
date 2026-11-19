import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { captureInviteTokenFromUrl } from './services/inviteToken'
import { captureRecoveryLinkFromUrl } from './services/recoveryLink'

// 招待リンクで開かれた場合はレンダリング前にトークンを退避し、URLを `/` に戻す。
captureInviteTokenFromUrl()

// パスワード再設定メールのリンクで開かれたかを、Supabase が URL を消費する前に控える。
captureRecoveryLinkFromUrl()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
