import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
        '/api': {
            target: 'http://127.0.0.1:5000',
            changeOrigin: true,
            cookieDomainRewrite: 'localhost'
        }
    },
    // Test and Lighthouse runs write reports here; watching them would reload the dev server mid-run.
    watch: {
        ignored: ['**/playwright-report/**', '**/test-results/**', '**/blob-report/**', '**/.lighthouseci/**', '**/lighthouse/**']
    }
}
})
