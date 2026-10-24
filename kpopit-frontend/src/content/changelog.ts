import { newestFirst, type Post } from "../utils/posts";

// Changelog posts live in content/changelog/*.md (see content/README.md). The ?post query hands
// each file to the markdownPosts Vite plugin, which renders it at build time. No route yet (Phase 6b).
const posts = import.meta.glob<Post>("/content/changelog/*.md", { query: "?post", import: "default", eager: true });

export const CHANGELOG_POSTS = newestFirst(Object.values(posts));
