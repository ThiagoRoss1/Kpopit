import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

// vite preview stand-in for the vercel.json rewrite: paths without a prerendered file get the SPA
// fallback, never the prerendered home page that preview would otherwise serve. React Router's own
// prerender also runs through a preview server: its requests must reach the renderer untouched.
export function spaFallbackPreview(): Plugin {
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
