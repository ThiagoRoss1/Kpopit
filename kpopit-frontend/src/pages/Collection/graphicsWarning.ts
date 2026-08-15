import type { GfxKey, GfxSettings, SelectableGfxPreset } from './collectionFx.ts';

/** One-time flag: the user has been warned that heavy graphics may stutter here. */
const WARNED_KEY = 'kpopit-collections-hq-warned';

export function hasHeavyGraphicsWarned(): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
        return localStorage.getItem(WARNED_KEY) === 'true';
    } catch {
        // Fail safe: treat as "not warned" so the confirm modal still shows.
        return false;
    }
}

export function markHeavyGraphicsWarned(): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(WARNED_KEY, 'true');
    } catch {
        // Private mode / quota: the warning simply may show again — never break settings.
    }
}

/** A heavy change that was intercepted, held until the user confirms. */
export type PendingHeavyAction =
    | { kind: 'preset'; value: SelectableGfxPreset }
    | { kind: 'gfx'; key: GfxKey; value: GfxSettings[GfxKey] };

/** The High preset is the heavy one. */
export function isHeavyPreset(next: SelectableGfxPreset): boolean {
    return next === 'high';
}

/** The individual heavy graphics changes: max card graphics, full-res album
    textures, and turning the holo shimmer on. */
export function isHeavyGfx<K extends GfxKey>(key: K, value: GfxSettings[K]): boolean {
    return (
        (key === 'cards' && value === 'high') ||
        (key === 'albumTextures' && value === 'high') ||
        (key === 'holoShine' && value === true)
    );
}
