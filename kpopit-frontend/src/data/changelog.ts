// What changed and when, newest first. Typed data (not Markdown): each entry is a short list of
// tagged items; a major update may point to its blog post by slug.
export type ChangeType = "new" | "change" | "fix";

export interface ChangelogEntry {
    /** ISO date (YYYY-MM-DD). */
    date: string;
    title: string;
    items: { type: ChangeType; text: string }[];
    /** Slug of a blog post about this update. */
    post?: string;
}

export const CHANGE_TYPES: ChangeType[] = ["new", "change", "fix"];

export const CHANGELOG: ChangelogEntry[] = [
    {
        date: "2026-07-02",
        title: "New game mode: Pixelated",
        post: "2026-07-02-pixelated-is-here",
        items: [{ type: "new", text: "Guess the daily K-pop album from its progressively de-pixelating cover art." }],
    },
    {
        date: "2026-05-18",
        title: "New feature: Accounts",
        post: "2026-05-18-accounts",
        items: [{ type: "new", text: "Login and Register to save your progress and stats across devices." }],
    },
    {
        date: "2026-04-08",
        title: "New feature: Idols page and profiles",
        post: "2026-04-08-idol-pages",
        items: [{ type: "new", text: "Added a dedicated page for idols with detailed information, including career, personal profiles and more." }],
    },
    {
        date: "2026-03-27",
        title: "Database changed to PostgreSQL",
        post: "2026-03-27-postgresql",
        items: [{ type: "change", text: "Migrated from SQLite to PostgreSQL for better performance and long-term scalability." }],
    },
    {
        date: "2026-02-09",
        title: "New game mode: Blurry",
        post: "2026-02-09-blurry",
        items: [
            { type: "new", text: "Guess the idol from a blurry image that gets clearer with each guess." },
            { type: "change", text: "Interface and optimization updates." },
        ],
    },
    { date: "2025-12-26", title: "Game launch!", items: [], post: "2025-12-26-launch" },
];

/** Entries with at least one item of that type ("all" keeps every entry). */
export function filterChangelog(entries: ChangelogEntry[], type: ChangeType | "all"): ChangelogEntry[] {
    return type === "all" ? entries : entries.filter((e) => e.items.some((i) => i.type === type));
}

/** A ?type= value we know, else "all". */
export function parseChangeType(value: string | null): ChangeType | "all" {
    return CHANGE_TYPES.includes(value as ChangeType) ? (value as ChangeType) : "all";
}
