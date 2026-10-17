import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'

// vite preview stand-in for the vercel.json rewrite: paths without a prerendered file get the SPA
// fallback, never the prerendered home page that preview would otherwise serve.
function spaFallbackPreview(): Plugin {
  return {
    name: 'kpopit-spa-fallback-preview',
    configurePreviewServer(server) {
      const root = path.resolve(server.config.root, 'build/client');
      server.middlewares.use((req, _res, next) => {
        const url = new URL(req.url ?? '/', 'http://preview');
        if (req.method !== 'GET' || url.pathname.startsWith('/api') || path.extname(url.pathname)) return next();
        const page = path.posix.join(url.pathname, 'index.html');
        req.url = fs.existsSync(path.join(root, page)) ? page : '/__spa-fallback.html';
        next();
      });
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  envDir: process.env.E2E_ISOLATED === 'true' ? false : undefined,
  plugins: [
    reactRouter(),
    tailwindcss(),
    spaFallbackPreview(),
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
