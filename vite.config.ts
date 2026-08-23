import { createLogger, defineConfig } from 'vite'
import type { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl' 

const hostLanIp = process.env.HOST_LAN_IP
const pwaIcon192 = 'pwa-192x192.png'
const pwaIcon512 = 'pwa-512x512.png'
const logger = createLogger()
const logInfo = logger.info

logger.info = (message, options) => {
  const displayedMessage = hostLanIp && message.includes('Network')
    ? message.replace(/eth0/g, 'PC IPv4')
    : message

  logInfo(displayedMessage, options)
}

/**
 * VitePWA(devOptions.enabled) は /dev-dist/registerSW.js を参照するが、
 * gitignore された空ディレクトリだと ENOENT になる。無ければ最小スタブを置く。
 */
function ensureDevDistRegisterSW(): Plugin {
  const writeStub = (root: string) => {
    const dir = path.resolve(root, 'dev-dist')
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, 'registerSW.js')
    if (fs.existsSync(file)) return
    fs.writeFileSync(
      file,
      "if('serviceWorker' in navigator)navigator.serviceWorker.register('/dev-sw.js?dev-sw',{scope:'/',type:'module'})\n",
    )
  }

  return {
    name: 'ensure-dev-dist-register-sw',
    apply: 'serve',
    configResolved(config) {
      writeStub(config.root)
    },
    configureServer() {
      writeStub(process.cwd())
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  customLogger: logger,
  plugins: [
    {
      name: 'display-host-lan-ip',
      configureServer(server) {
        if (!hostLanIp) return

        const printUrls = server.printUrls
        server.printUrls = () => {
          if (server.resolvedUrls) {
            server.resolvedUrls.network = [`https://${hostLanIp}:5173/`]
          }
          printUrls()
        }
      },
    },
    react(),
    basicSsl(),
    ensureDevDistRegisterSW(),
    VitePWA({
      // Web Push を扱うため自前の Service Worker (src/sw.ts) を注入する
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
      // dev でも SW が動かないと Push の購読テストができない
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
      includeAssets: ['favicon.svg', pwaIcon192, pwaIcon512],
      workbox: {
        // /constellation-proto/ (検証用プロトタイプ) は本体とは別アプリなので、
        // SPA の navigateFallback で本体の index.html を返さない・precache もしない
        navigateFallbackDenylist: [/^\/constellation-proto\//],
        globIgnores: ['constellation-proto/**'],
      },
      manifest: {
        name: 'mekulunlun',
        short_name: 'めくるん',
        description: 'カレンダー・チャット・思い出共有PWA',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          {
            src: pwaIcon192,
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: pwaIcon512,
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: pwaIcon512,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      // 星座カレンダー検証ページを別 HTML エントリとして同梱する
      // (dist/constellation-proto/index.html → /constellation-proto/ で配信)
      input: {
        main: 'index.html',
        constellationLab: 'constellation-proto/index.html',
      },
    },
  },
  server: {
    host: true,
    watch: {
      usePolling: true,
    },
  },
})
