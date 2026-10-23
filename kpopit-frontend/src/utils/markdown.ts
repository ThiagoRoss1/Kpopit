// Markdown for the repo's own posts (changelog / blog), rendered at build time. A small subset
// with every bit of text HTML-escaped first: headings, paragraphs, lists, bold, italic, code, links.

export interface PostFrontmatter {
    title: string;
    date: string;
    description: string;
}

export interface Post extends PostFrontmatter {
    slug: string;
    html: string;
}

const escapeHtml = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Splits `---` frontmatter (key: value lines) from the body; throws on a missing required field. */
export function parseFrontmatter(source: string): { data: PostFrontmatter; body: string } {
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) throw new Error("Post is missing its --- frontmatter block");
    const fields: Record<string, string> = {};
    for (const line of match[1].split(/\r?\n/)) {
        const pair = line.match(/^(\w+):\s*(.*)$/);
        if (pair) fields[pair[1]] = pair[2].replace(/^["']|["']$/g, "").trim();
    }
    for (const key of ["title", "date", "description"] as const) {
        if (!fields[key]) throw new Error(`Post frontmatter is missing "${key}"`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.date)) throw new Error("Post date must be YYYY-MM-DD");
    return { data: { title: fields.title, date: fields.date, description: fields.description }, body: match[2] };
}

const inline = (text: string) =>
    escapeHtml(text)
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        // Only absolute https links and site paths; anything else (javascript:, data:) stays text.
        .replace(/\[([^\]]+)\]\(((?:https:\/\/|\/)[^)\s]*)\)/g, '<a href="$2">$1</a>');

export function renderMarkdown(body: string): string {
    const html: string[] = [];
    let paragraph: string[] = [];
    let list: string[] = [];
    const flush = () => {
        if (paragraph.length) html.push(`<p>${inline(paragraph.join(" "))}</p>`);
        if (list.length) html.push(`<ul>${list.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`);
        paragraph = [];
        list = [];
    };
    for (const raw of body.split(/\r?\n/)) {
        const line = raw.trim();
        const heading = line.match(/^(#{1,3})\s+(.*)$/);
        const item = line.match(/^[-*]\s+(.*)$/);
        if (!line) {
            flush();
        } else if (heading) {
            flush();
            const level = heading[1].length + 1; // the page title is the h1
            html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
        } else if (item) {
            if (paragraph.length) flush();
            list.push(item[1]);
        } else {
            if (list.length) flush();
            paragraph.push(line);
        }
    }
    flush();
    return html.join("\n");
}

/** Posts from `path → source` (as import.meta.glob returns them), newest first. */
export function loadPosts(sources: Record<string, string>): Post[] {
    return Object.entries(sources)
        .map(([path, source]) => {
            const { data, body } = parseFrontmatter(source);
            const slug = path.split("/").pop()!.replace(/\.md$/, "");
            return { ...data, slug, html: renderMarkdown(body) };
        })
        .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}
