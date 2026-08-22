import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 本体 (advent-calendar-front) のビルドに同梱し、/constellation-proto/ 配下で配信する。
// 開発時はルート直下のままにして http://localhost:5175/ で開けるようにする。
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/constellation-proto/' : '/',
  plugins: [react()],
  server: {
    port: 5175,
  },
  build: {
    outDir: '../dist/constellation-proto',
    emptyOutDir: true,
  },
}))
