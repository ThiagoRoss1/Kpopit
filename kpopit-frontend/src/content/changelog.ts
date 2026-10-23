import { loadPosts } from "../utils/markdown";

// Changelog posts live in content/changelog/*.md (frontmatter: title, date, description). Vite
// inlines them at build time, so pages render the HTML without fetching anything. No route yet (Phase 6b).
const sources = import.meta.glob<string>("/content/changelog/*.md", { query: "?raw", import: "default", eager: true });

export const CHANGELOG_POSTS = loadPosts(sources);
