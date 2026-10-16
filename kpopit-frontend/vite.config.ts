import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  envDir: process.env.E2E_ISOLATED === 'true' ? false : undefined,
  plugins: [react(), tailwindcss()],
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
        ignored: ['**/playwright-report/**', '**/test-results/**', '**/blob-report/**', '**/.lighthouseci/**', '**/lighthouse/**', '**/.email-outbox/**']
    }
}
})
