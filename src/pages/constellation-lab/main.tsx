// ==========================================
// 星座カレンダー検証ページのエントリ
// 本体 (src/main.tsx) とは別の HTML エントリ (constellation-proto/index.html) から起動する。
// 本体の index.css は読み込まず、このページ専用の themes.css だけを適用する。
// ==========================================
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './themes/themes.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
