// Markdown for the repo's own blog posts, rendered with `marked` at build time only.
// Raw HTML in a post is escaped; links must be https or site paths; images must come from the
// site (/...) or the image bucket. Anything else is shown as plain text.
import { Marked, type Tokens } from "marked";
import { newestFirst, POST_TAGS, type Post, type PostFrontmatter, type PostTag } from "./posts.ts";

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

/** `cdn:/images/...` is a path on the image bucket (the album covers and idol photos the game uses):
 *  it becomes an absolute bucket URL, or a site path when the build has no bucket URL (tests). */
export const resolveImage = (src: string, imageOrigin?: string) =>
    src.startsWith("cdn:/") ? `${imageOrigin?.replace(/\/+$/, "") ?? ""}${src.slice(4)}` : src;

const CTA_ARROW = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>';

const isAllowedLink = (href: string) => isSitePath(href) || /^https:\/\/[^/\\]/i.test(href);

const REQUIRED = ["title", "date", "description", "image", "imageAlt", "tag"] as const;
const WORDS_PER_MINUTE = 200;

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
    fields.image = resolveImage(fields.image, options.imageOrigin);
    if (!isAllowedImage(fields.image, options.imageOrigin)) {
        throw new Error(`Post image must be a site path (/blog/...) or on the image bucket: ${fields.image}`);
    }
    if (!POST_TAGS.includes(fields.tag as PostTag)) throw new Error(`Post tag must be one of ${POST_TAGS.join(", ")}: ${fields.tag}`);
    if (fields.pinned !== undefined && fields.pinned !== "true" && fields.pinned !== "false") {
        throw new Error(`Post pinned must be true or false: ${fields.pinned}`);
    }
    const data = {
        ...Object.fromEntries(REQUIRED.map((key) => [key, fields[key]])),
        pinned: fields.pinned === "true",
        ...(fields.ko ? { ko: fields.ko } : {}),
    } as unknown as PostFrontmatter;
    return { data, body: match[2] };
}

export function renderMarkdown(body: string, options: RenderOptions = {}): string {
    const marked = new Marked({
        gfm: true,
        async: false,
        renderer: {
            html: ({ text }) => escapeHtml(text),
            // A paragraph that is only a link is a button; one that is only an image, a figure whose
            // caption is the alt text.
            paragraph({ tokens }: Tokens.Paragraph) {
                const only = tokens.length === 1 ? tokens[0] : null;
                if (only?.type === "link" && isAllowedLink(only.href)) {
                    return `<p class="post-cta"><a href="${escapeHtml(only.href)}">${this.parser.parseInline(only.tokens)}${CTA_ARROW}</a></p>\n`;
                }
                if (only?.type === "image") {
                    const img = this.parser.parseInline(tokens);
                    if (!img.startsWith("<img")) return `<p>${img}</p>\n`;
                    return `<figure>${img}${only.text ? `<figcaption>${escapeHtml(only.text)}</figcaption>` : ""}</figure>\n`;
                }
                return `<p>${this.parser.parseInline(tokens)}</p>\n`;
            },
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
            image({ href: raw, title, text }: Tokens.Image) {
                const href = resolveImage(raw, options.imageOrigin);
                if (!isAllowedImage(href, options.imageOrigin)) return escapeHtml(text);
                const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
                return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${titleAttr} loading="lazy">`;
            },
        },
    });
    return (marked.parse(body) as string).trim();
}

/** Reading time from the Markdown body: words (link targets and syntax left out) / 200, rounded up. */
export function readMinutes(body: string): number {
    const text = body.replace(/```[\s\S]*?```/g, " ").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[#>*_`|-]/g, " ");
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/** Posts from `path → source` (the content/blog/*.md files), newest first. */
export function loadPosts(sources: Record<string, string>, options: RenderOptions = {}): Post[] {
    return newestFirst(Object.entries(sources).map(([path, source]) => loadPost(path, source, options)));
}

export function loadPost(path: string, source: string, options: RenderOptions = {}): Post {
    const { data, body } = parseFrontmatter(source, options);
    const slug = path.split("/").pop()!.replace(/\.md$/, "");
    return { ...data, slug, html: renderMarkdown(body, options), readMinutes: readMinutes(body) };
}
