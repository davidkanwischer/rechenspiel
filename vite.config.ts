import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Zielzahl',
        short_name: 'Zielzahl',
        description: 'Rechen-Knobelspiel: Triff die Zielzahl.',
        lang: 'de',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f1222',
        theme_color: '#0f1222',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: { environment: 'node' },
} as any)
