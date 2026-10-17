// Search lists (all idols / all albums) kept in localStorage between visits, so the search works
// at once on the next visit. Versioned keys: change the version when the list shape changes.

export const ALL_IDOLS_KEY = "kpopit_allIdols_v1";
export const ALL_ALBUMS_KEY = "kpopit_allAlbums_v1";

export function readPersistedList<T>(key: string): T[] | undefined {
    if (typeof window === "undefined") return undefined;
    try {
        const raw = localStorage.getItem(key);
        const parsed: unknown = raw ? JSON.parse(raw) : undefined;
        return Array.isArray(parsed) ? (parsed as T[]) : undefined;
    } catch {
        return undefined;
    }
}

// Wraps a list fetcher so every successful fetch refreshes the stored copy.
export function persistingFetch<T>(key: string, fetchList: () => Promise<T[]>): () => Promise<T[]> {
    return async () => {
        const list = await fetchList();
        try {
            localStorage.setItem(key, JSON.stringify(list));
        } catch {
            // Storage full or blocked: the list still works for this visit.
        }
        return list;
    };
}
