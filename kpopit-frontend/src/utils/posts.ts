// Blog posts as the app receives them: already rendered to HTML at build time
// (src/utils/markdown.ts, run by the Vite plugin), so no Markdown code ships to the browser.
import { SITE_URL } from "./site.ts";

export const POST_TAGS = ["Update", "Dev log", "Thoughts", "News"] as const;
export type PostTag = (typeof POST_TAGS)[number];

export interface PostFrontmatter {
    title: string;
    date: string;
    description: string;
    /** Thumbnail: a site path (public/blog/<slug>/...) or an image bucket URL. */
    image: string;
    imageAlt: string;
    tag: PostTag;
    /** Shown in the blog's Pinned block (never for the latest post). */
    pinned: boolean;
}

export interface Post extends PostFrontmatter {
    slug: string;
    html: string;
    /** ceil(words / 200), at least 1. */
    readMinutes: number;
}

export const newestFirst = (posts: Post[]): Post[] =>
    [...posts].sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));

/** Absolute URL of the post's thumbnail, for its og:image. */
export const postImageUrl = (post: Pick<Post, "image">): string =>
    post.image.startsWith("/") ? `${SITE_URL}${post.image}` : post.image;
