import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Ship corrections silently. The calculators have had genuine formula bugs, so a
      // user must never be left running a cached copy with wrong maths because they did
      // not click an "update available" prompt.
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // No `includeAssets` here: the workbox globPatterns below already match every
      // static file in public/, and listing them twice just duplicates precache entries.

      manifest: {
        name: 'Sidlab Tools — Laboratory Calculators',
        short_name: 'Sidlab Tools',
        description:
          'Offline-capable laboratory calculators: dilutions, molarity, pH, primer Tm, SDS-PAGE gels, cell counts and more.',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        display: 'standalone',
        // Relative so the app installs correctly from a project subpath
        // (siddhantrajnaik.github.io/SidLab-Tools/) as well as from a domain root.
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Separate artwork: padded into the safe zone so platforms can crop it to a
          // circle or squircle without clipping the flask.
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      workbox: {
        // The plugin already precaches manifest.webmanifest and the icons declared in it,
        // so those are deliberately not globbed here — only the assets it does not add.
        globPatterns: ['**/*.{js,css,html}', 'favicon.svg', 'apple-touch-icon.png'],
        // The app uses HashRouter, so every route is served by index.html.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Google Fonts stylesheet: refresh in the background, serve instantly.
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            // The font files themselves are immutable, so cache them hard.
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      devOptions: { enabled: false },
    }),
  ],
  // 'base' is crucial for GitHub Pages.
  // './' ensures assets are loaded relatively, so it works in any subfolder (e.g. username.github.io/repo/).
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
});
