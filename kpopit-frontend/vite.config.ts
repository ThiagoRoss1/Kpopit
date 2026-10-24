import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { loadPost } from './src/utils/markdown.ts'

// vite preview stand-in for the vercel.json rewrite: paths without a prerendered file get the SPA
// fallback, never the prerendered home page that preview would otherwise serve. React Router's own
// prerender also runs through a preview server: its requests must reach the renderer untouched.
function spaFallbackPreview(): Plugin {
  return {
    name: 'kpopit-spa-fallback-preview',
    configurePreviewServer(server) {
      const root = path.resolve(server.config.root, 'build/client');
      server.middlewares.use((req, _res, next) => {
        if (process.env.IS_RR_BUILD_REQUEST === 'yes') return next();
        const url = new URL(req.url ?? '/', 'http://preview');
        if (req.method !== 'GET' || url.pathname.startsWith('/api') || path.extname(url.pathname)) return next();
        const page = path.posix.join(url.pathname, 'index.html');
        req.url = fs.existsSync(path.join(root, page)) ? page : '/__spa-fallback.html';
        next();
      });
    },
  }
}

// content/<kind>/*.md?post → the rendered post as a module: marked runs here at build time and
// never ships to the browser. A thumbnail on a site path must exist in public/.
function markdownPosts(): Plugin {
  let imageOrigin: string | undefined
  let publicDir = ''
  return {
    name: 'kpopit-markdown-posts',
    configResolved(config) {
      imageOrigin = config.env.VITE_IMAGE_BUCKET_URL || undefined
      publicDir = config.publicDir
    },
    load(id) {
      const [file, query] = id.split('?')
      if (query !== 'post' || !file.endsWith('.md')) return
      this.addWatchFile(file)
      const post = loadPost(file, fs.readFileSync(file, 'utf8'), { imageOrigin })
      if (post.image.startsWith('/') && !fs.existsSync(path.join(publicDir, post.image))) {
        this.error(`${post.slug}: thumbnail ${post.image} is not in public/`)
      }
      return `export default ${JSON.stringify(post)}`
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
