// Changelog / blog posts as the app receives them: already rendered to HTML at build time
// (src/utils/markdown.ts, run by the Vite plugin), so no Markdown code ships to the browser.
import { SITE_URL } from "./site.ts";

export interface PostFrontmatter {
    title: string;
    date: string;
    description: string;
    /** Thumbnail: a site path (public/blog/<slug>/...) or an image bucket URL. */
    image: string;
    imageAlt: string;
}

export interface Post extends PostFrontmatter {
    slug: string;
    html: string;
}

export const newestFirst = (posts: Post[]): Post[] =>
    [...posts].sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));

/** Absolute URL of the post's thumbnail, for its og:image once the post route ships. */
export const postImageUrl = (post: Pick<Post, "image">): string =>
    post.image.startsWith("/") ? `${SITE_URL}${post.image}` : post.image;
