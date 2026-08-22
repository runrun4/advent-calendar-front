import { createLogger, defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl' 

const hostLanIp = process.env.HOST_LAN_IP
const logger = createLogger()
const logInfo = logger.info

logger.info = (message, options) => {
  const displayedMessage = hostLanIp && message.includes('Network')
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
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'めくるんるん',
        short_name: 'めくるん',
        description: 'カレンダー・チャット・思い出共有PWA',
        theme_color: '#ffffff',
        background_color: '#ffffff',
icons: [
  {
    src: 'pwa-192x192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'any'
  },
  {
    src: 'pwa-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any'
  },
  {
    src: 'pwa-512x512-maskable.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable'
  }
]
      }
    })
  ],
  server: {
    host: true,
    watch: {
      usePolling: true,
    },
  },
})
