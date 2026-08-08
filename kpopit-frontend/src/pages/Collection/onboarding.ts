/** One-time flag: the collection-album first-run tour has been shown. */
const GUIDE_KEY = 'kpopit-collections-guide-seen';

export function hasSeenCollectionGuide(): boolean {
    if (typeof localStorage === 'undefined') return true; // never auto-run without storage
    try {
        return localStorage.getItem(GUIDE_KEY) === 'true';
    } catch {
        // Fail safe: treat as "already seen" so the tour never auto-runs in private mode or quota-exceeded storage.
        return true;
    }
}

export function markCollectionGuideSeen(): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(GUIDE_KEY, 'true');
    } catch {
        // Private mode / quota: the tour may show again next visit, which is harmless.
    }
}
