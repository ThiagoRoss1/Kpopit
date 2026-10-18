// Search lists (all idols / all albums) kept in localStorage between visits, so the search works
// at once on the next visit. The stored copy only fills the first render: each visit refetches the
// list in the background and replaces it (catalog edits show up on the next visit at the latest).
// Bump the key version when the list shape changes; copies older than MAX_AGE are ignored.

export const ALL_IDOLS_KEY = "kpopit_allIdols_v2";
export const ALL_ALBUMS_KEY = "kpopit_allAlbums_v2";

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type Stored<T> = { savedAt: number; list: T[] };

export function readPersistedList<T>(key: string): T[] | undefined {
    if (typeof window === "undefined") return undefined;
    try {
        const raw = localStorage.getItem(key);
        const stored = raw ? (JSON.parse(raw) as Partial<Stored<T>>) : undefined;
        if (!stored || !Array.isArray(stored.list) || typeof stored.savedAt !== "number") return undefined;
        return Date.now() - stored.savedAt < MAX_AGE_MS ? stored.list : undefined;
    } catch {
        return undefined;
    }
}

// Wraps a list fetcher so every successful fetch refreshes the stored copy.
export function persistingFetch<T>(key: string, fetchList: () => Promise<T[]>): () => Promise<T[]> {
    return async () => {
        const list = await fetchList();
        try {
            const stored: Stored<T> = { savedAt: Date.now(), list };
            localStorage.setItem(key, JSON.stringify(stored));
        } catch {
            // Storage full or blocked: the list still works for this visit.
        }
        return list;
    };
}
