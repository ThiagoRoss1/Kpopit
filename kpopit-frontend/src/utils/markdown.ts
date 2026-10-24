// Markdown for the repo's own posts (changelog / blog), rendered with `marked` at build time only.
// Raw HTML in a post is escaped; links must be https or site paths; images must come from the
// site (/...) or the image bucket. Anything else is shown as plain text.
import { Marked, type Tokens } from "marked";
import { newestFirst, type Post, type PostFrontmatter } from "./posts.ts";

export interface RenderOptions {
    /** Image bucket origin (VITE_IMAGE_BUCKET_URL's), the only allowed absolute image source. */
    imageOrigin?: string;
}

const escapeHtml = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const isSitePath = (url: string) => url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\");

export function isAllowedImage(src: string, imageOrigin?: string): boolean {
    if (isSitePath(src)) return true;
    if (!imageOrigin) return false;
    try {
        return new URL(src).origin === new URL(imageOrigin).origin;
    } catch {
        return false;
    }
}

const isAllowedLink = (href: string) => isSitePath(href) || /^https:\/\/[^/\\]/i.test(href);

const REQUIRED = ["title", "date", "description", "image", "imageAlt"] as const;

/** Splits `---` frontmatter (key: value lines) from the body; throws on a missing or invalid field. */
export function parseFrontmatter(source: string, options: RenderOptions = {}): { data: PostFrontmatter; body: string } {
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) throw new Error("Post is missing its --- frontmatter block");
    const fields: Record<string, string> = {};
    for (const line of match[1].split(/\r?\n/)) {
        const pair = line.match(/^(\w+):\s*(.*)$/);
        if (pair) fields[pair[1]] = pair[2].replace(/^["']|["']$/g, "").trim();
    }
    for (const key of REQUIRED) {
        if (!fields[key]) throw new Error(`Post frontmatter is missing "${key}"`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.date)) throw new Error("Post date must be YYYY-MM-DD");
    if (!isAllowedImage(fields.image, options.imageOrigin)) {
        throw new Error(`Post image must be a site path (/blog/...) or on the image bucket: ${fields.image}`);
    }
    const data = Object.fromEntries(REQUIRED.map((key) => [key, fields[key]])) as unknown as PostFrontmatter;
    return { data, body: match[2] };
}

export function renderMarkdown(body: string, options: RenderOptions = {}): string {
    const marked = new Marked({
        gfm: true,
        async: false,
        renderer: {
            html: ({ text }) => escapeHtml(text),
            // The page title is the h1, so a post's headings start at h2.
            heading({ tokens, depth }) {
                const level = Math.min(depth + 1, 6);
                return `<h${level}>${this.parser.parseInline(tokens)}</h${level}>\n`;
            },
            link({ href, title, tokens }: Tokens.Link) {
                const text = this.parser.parseInline(tokens);
                if (!isAllowedLink(href)) return text;
                return `<a href="${escapeHtml(href)}"${title ? ` title="${escapeHtml(title)}"` : ""}>${text}</a>`;
            },
            image({ href, title, text }: Tokens.Image) {
                if (!isAllowedImage(href, options.imageOrigin)) return escapeHtml(text);
                const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
                return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${titleAttr} loading="lazy">`;
            },
        },
    });
    return (marked.parse(body) as string).trim();
}

/** Posts from `path → source` (the content/<kind>/*.md files), newest first. */
export function loadPosts(sources: Record<string, string>, options: RenderOptions = {}): Post[] {
    return newestFirst(Object.entries(sources).map(([path, source]) => loadPost(path, source, options)));
}

export function loadPost(path: string, source: string, options: RenderOptions = {}): Post {
    const { data, body } = parseFrontmatter(source, options);
    const slug = path.split("/").pop()!.replace(/\.md$/, "");
    return { ...data, slug, html: renderMarkdown(body, options) };
}
