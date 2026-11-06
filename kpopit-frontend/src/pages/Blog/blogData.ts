import { POST_TAGS, type Post, type PostTag } from "../../utils/posts.ts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const tagKey = (tag: PostTag) => tag.toLowerCase().replace(/\s+/g, "-");
export const tagFromKey = (key: string | null): PostTag | null => POST_TAGS.find((t) => tagKey(t) === key) ?? null;

/** "Jul 2, 2026" from an ISO date, without time zones getting in the way. */
export function formatPostDate(iso: string): string {
    const [y, m, d] = iso.split("-").map(Number);
    return `${MONTHS[m - 1]} ${d}, ${y}`;
}

const DAY_MS = 864e5;
/** Posted in the last 7 days (today counts). */
export function isNewPost(iso: string, today: Date): boolean {
    const age = (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.parse(`${iso}T00:00:00Z`)) / DAY_MS;
    return age >= 0 && age <= 7;
}

/** Three posts to read next: same tag first, then the closest in time. */
export function readNext(posts: Post[], current: Post): Post[] {
    const at = posts.indexOf(current);
    return posts
        .filter((p) => p !== current)
        .sort((a, b) => Number(b.tag === current.tag) - Number(a.tag === current.tag)
            || Math.abs(posts.indexOf(a) - at) - Math.abs(posts.indexOf(b) - at))
        .slice(0, 3);
}
