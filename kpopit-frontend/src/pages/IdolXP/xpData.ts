import type { IdolListItem } from "../../interfaces/gameInterfaces";
import type { IdolXpState } from "../../interfaces/playerInterfaces";

export const MAX_LEVEL = 10;
export const MAX_XP = 3 * MAX_LEVEL * MAX_LEVEL;
export const LIST_LIMIT = 30;
export const FAVOURITES_KEY = "kpopit-xp-favs";

/** Same values as the backend's xp_service constants. */
export const RULES: { label: string; value: string }[] = [
    { label: "Finished game", value: "+10" },
    { label: "One-shot", value: "+3" },
    { label: "3 tries or fewer", value: "+1" },
    { label: "Calendar game", value: "+5" },
    { label: "Maxed idols keep", value: "40%" },
];

export interface Level {
    level: number;
    max: boolean;
    /** XP of the next level (300 once maxed). */
    next: number;
    /** Progress inside the current level, 0..1. */
    progress: number;
}

/** Levels follow 3 · n² total XP, like the backend. */
export function levelOf(xp: number): Level {
    let level = 0;
    while (level < MAX_LEVEL && 3 * (level + 1) ** 2 <= xp) level++;
    const max = level >= MAX_LEVEL;
    const low = 3 * level ** 2;
    const next = max ? MAX_XP : 3 * (level + 1) ** 2;
    return { level, max, next, progress: max ? 1 : (xp - low) / (next - low) };
}

export interface XpIdol extends Level {
    id: number;
    name: string;
    group: string;
    imagePath: string;
    imageVersion: string;
    /** Shown XP, capped at max level (the 40% past it is kept but not drawn). */
    xp: number;
}

export function buildIdols(list: IdolListItem[], state: IdolXpState | null): XpIdol[] {
    const xpById = new Map((state?.idols ?? []).map((i) => [i.idol_id, i.xp]));
    return list.map((idol) => {
        const xp = Math.min(MAX_XP, Math.floor(xpById.get(idol.id) ?? 0));
        return {
            id: idol.id,
            name: idol.artist_name,
            group: idol.active_group ?? idol.groups?.[0] ?? "Soloist",
            imagePath: idol.image_path,
            imageVersion: idol.image_version,
            xp,
            ...levelOf(xp),
        };
    });
}

export const FILTERS = {
    All: () => true,
    Leveling: (i: XpIdol) => i.xp > 0 && !i.max,
    "Not started": (i: XpIdol) => i.xp === 0,
    Maxed: (i: XpIdol) => i.max,
} satisfies Record<string, (i: XpIdol) => boolean>;

export type XpFilter = keyof typeof FILTERS;

export function readFavourites(): number[] {
    try {
        const saved: unknown = JSON.parse(localStorage.getItem(FAVOURITES_KEY) ?? "[]");
        return Array.isArray(saved) ? saved.filter((id): id is number => typeof id === "number") : [];
    } catch {
        return [];
    }
}

export function saveFavourites(ids: number[]) {
    try {
        localStorage.setItem(FAVOURITES_KEY, JSON.stringify(ids));
    } catch {
        // Private mode or full storage: favourites just won't persist.
    }
}
