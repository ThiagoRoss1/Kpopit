const FX_KEY = 'kpopit-collections-fx';

export type FxKey = 'backdrop' | 'paper' | 'shadows' | 'blur' | 'hq' | 'sparkles' | 'lv2' | 'lv3';
export type FxState = Record<FxKey, boolean>;

export const FX_GROUPS = {
    texture: ['backdrop', 'paper', 'shadows', 'blur', 'hq'] as FxKey[],
    motion: ['sparkles', 'lv2', 'lv3'] as FxKey[],
};

const DEFAULTS: FxState = {
    backdrop: true, paper: true, shadows: true, blur: true, hq: true,
    sparkles: true, lv2: true, lv3: true,
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
 * their OS, not a hardware guess and the CSS already silences .album-level-clock
 * and the sparkles under it, so leaving these switches "on" would show controls
 * for animation that provably is not running.
 */
function withMotionPreference(base: FxState): FxState {
    const reduced = typeof matchMedia === 'function'
        && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) return base;
    return { ...base, sparkles: false, lv2: false, lv3: false };
}

const FX_ORDER: FxKey[] = [...FX_GROUPS.texture, ...FX_GROUPS.motion];

let state: FxState = readStored();
const listeners = new Set<() => void>();

const lastByGroup: Partial<Record<'texture' | 'motion', FxState>> = {};

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

export function setFxGroup(group: 'texture' | 'motion', value: boolean) {
    const next = { ...state };
    if (value) {
        const remembered = lastByGroup[group];
        for (const key of FX_GROUPS[group]) {
            // `hq` is opt-in: a master turning things ON must never switch it on.
            if (key === 'hq') continue;
            next[key] = remembered ? remembered[key] : true;
        }
    } else {
        lastByGroup[group] = { ...state };
        for (const key of FX_GROUPS[group]) next[key] = false;
    }
    commit(next);
}
