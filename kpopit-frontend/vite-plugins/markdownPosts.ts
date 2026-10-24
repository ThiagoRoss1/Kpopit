import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'
import { loadPost } from '../src/utils/markdown.ts'

// content/<kind>/*.md?post → the rendered post as a module: marked runs here at build time and
// never ships to the browser. A thumbnail on a site path must exist in public/.
export function markdownPosts(): Plugin {
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
