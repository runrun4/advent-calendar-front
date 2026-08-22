import { createLogger, defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

const hostLanIp = process.env.HOST_LAN_IP
const pwaIcon192 = 'pwa-192x192.png'
const pwaIcon512 = 'pwa-512x512.png'
const logger = createLogger()
const logInfo = logger.info

logger.info = (message, options) => {
  const displayedMessage =
    hostLanIp && message.includes('Network')
      ? message.replace(/eth0/g, 'PC IPv4')
      : message

  logInfo(displayedMessage, options)
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

VitePWA({
  registerType: 'autoUpdate',
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'sw.ts',

  devOptions: {
    enabled: true,
  },

  includeAssets: ['favicon.svg', pwaIcon192, pwaIcon512],

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
            type: 'image/png',
          },
          {
            src: pwaIcon512,
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: pwaIcon512,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],

  server: {
    host: true,

    watch: {
      usePolling: true,
    },
  },
})