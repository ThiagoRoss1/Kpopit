import { defineConfig } from 'vite'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { spaFallbackPreview } from './vite-plugins/spaFallbackPreview.ts'
import { markdownPosts } from './vite-plugins/markdownPosts.ts'

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  envDir: process.env.E2E_ISOLATED === 'true' ? false : undefined,
  plugins: [
    reactRouter(),
    tailwindcss(),
    spaFallbackPreview(),
    markdownPosts(),
    // ANALYZE=true npm run build → build/bundle-stats.html (client bundle only, gzip sizes).
    process.env.ANALYZE === 'true' && !isSsrBuild &&
      visualizer({ filename: 'build/bundle-stats.html', template: 'treemap', gzipSize: true }),
  ],
  // Scan every module at dev startup: a dependency found later makes Vite answer 504 and reload the
  // page (mid-test on a cold CI cache).
  optimizeDeps: {
    entries: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
  },
  server: {
    proxy: {
        '/api': {
            target: 'http://127.0.0.1:5000',
            changeOrigin: true,
            cookieDomainRewrite: 'localhost'
        }
    },
    // Test and Lighthouse runs write reports (and the E2E email outbox) here; watching them would reload the dev server mid-run.
    watch: {
        ignored: ['**/playwright-report/**', '**/test-results/**', '**/blob-report/**', '**/.lighthouseci/**', '**/lighthouse/**', '**/.email-outbox/**', '**/build/**', '**/.react-router/**']
    }
}
}))
