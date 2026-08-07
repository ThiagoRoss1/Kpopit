const FX_KEY = 'kpopit-collections-fx';

export type FxKey = 'backdrop' | 'textures' | 'shadows' | 'blur' | 'sparkles' | 'lv2' | 'lv3' | 'tapZoom' | 'arrows';
export type FxState = Record<FxKey, boolean>;
export type FxGroup = keyof typeof FX_GROUPS;

export const FX_GROUPS = {
    texture: ['backdrop', 'textures', 'shadows', 'blur'] as FxKey[],
    motion: ['sparkles', 'lv2', 'lv3'] as FxKey[],
    controls: ['tapZoom', 'arrows'] as FxKey[],
};

const DEFAULTS: FxState = {
    backdrop: true, textures: true, shadows: true, blur: true,
    sparkles: true, lv2: true, lv3: true,
    tapZoom: true, arrows: true,
};

function readStored(): FxState {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return withMotionPreference(DEFAULTS);
    try {
        const raw = localStorage.getItem(FX_KEY);

        if (!raw) return withMotionPreference(DEFAULTS);

        const parsed = JSON.parse(raw) as Partial<FxState>;

        // Spread over DEFAULTS so a key added in a later release is simply on.
        return { ...DEFAULTS, ...parsed };
    } catch {
        return withMotionPreference(DEFAULTS);
    }
}

/**
 * First visit only. `prefers-reduced-motion` is a preference the person set in
 * their OS, not a hardware guess and the CSS already silences the LV2/LV3 card
 * animations and the sparkles under it, so leaving these switches "on" would show
 * controls for animation that provably is not running.
 */

function withMotionPreference(base: FxState): FxState {
    const reduced = typeof matchMedia === 'function'
        && matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reduced) return base;

    return { ...base, sparkles: false, lv2: false, lv3: false };
}

// Every group must appear here: `commit` only diffs these keys, so a key left out
// would silently never persist.
const FX_ORDER: FxKey[] = [...FX_GROUPS.texture, ...FX_GROUPS.motion, ...FX_GROUPS.controls];

let state: FxState = readStored();
const listeners = new Set<() => void>();

const lastByGroup: Partial<Record<FxGroup, FxState>> = {};

export function getFxSnapshot(): FxState {
    return state;
}

export function subscribeFx(listener: () => void): () => void {
    listeners.add(listener);

    return () => listeners.delete(listener);
}

function commit(next: FxState) {
    // Same object identity when nothing changed keeps useSyncExternalStore quiet.
    if (FX_ORDER.every((k) => next[k] === state[k])) return;

    state = next;

    try {
        localStorage.setItem(FX_KEY, JSON.stringify(state));
    } catch {
        // Private mode / quota: the session still works, it just won't persist.
    }

    listeners.forEach((listener) => listener());
}

export function setFx(key: FxKey, value: boolean) {
    commit({ ...state, [key]: value });
}

export function setFxGroup(group: FxGroup, value: boolean) {
    const next = { ...state };

    if (value) {
        const remembered = lastByGroup[group];

        for (const key of FX_GROUPS[group]) {
            next[key] = remembered ? remembered[key] : true;
        }
    } else {
        lastByGroup[group] = { ...state };

        for (const key of FX_GROUPS[group]) next[key] = false;
    }
    
    commit(next);
}
