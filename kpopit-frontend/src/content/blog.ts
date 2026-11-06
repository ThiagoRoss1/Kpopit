import { newestFirst, type Post } from "../utils/posts";

// Blog posts live in content/blog/*.md (see content/README.md). The ?post query hands each file to
// the markdownPosts Vite plugin, which renders it at build time.
const posts = import.meta.glob<Post>("/content/blog/*.md", { query: "?post", import: "default", eager: true });

export const BLOG_POSTS = newestFirst(Object.values(posts));
