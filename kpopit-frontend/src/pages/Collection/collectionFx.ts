import { probeDeviceTier, resolveDeviceTier, type DeviceTier } from './deviceTier.ts';

const FX_KEY = 'kpopit-collections-fx';
const STORAGE_VERSION = 3;

export type CardGraphics = 'high' | 'medium' | 'low' | 'border';
export type AlbumTextureGraphics = 'high' | 'low' | 'off';
export type GfxPreset = 'auto' | DeviceTier | 'custom';
export type SelectableGfxPreset = Exclude<GfxPreset, 'custom'>;

export interface GfxSettings {
    cards: CardGraphics;
    albumTextures: AlbumTextureGraphics;
    paper: boolean;
    shadows: boolean;
    blur: boolean;
    sparkles: boolean;
    goldShine: boolean;
    holoShine: boolean;
    tapZoom: boolean;
    arrows: boolean;
}

export type GfxKey = keyof GfxSettings;

export const DEFAULT_SETTINGS: GfxSettings = {
    cards: 'high',
    albumTextures: 'high',
    paper: true,
    shadows: true,
    blur: true,
    sparkles: true,
    goldShine: true,
    holoShine: true,
    tapZoom: true,
    arrows: true,
};

const PRESETS: Record<DeviceTier, Omit<GfxSettings, 'tapZoom' | 'arrows'>> = {
    high: {
        cards: 'high',
        albumTextures: 'high',
        paper: true,
        shadows: true,
        blur: true,
        sparkles: true,
        goldShine: true,
        holoShine: true,
    },
    medium: {
        cards: 'medium',
        albumTextures: 'low',
        paper: true,
        shadows: true,
        blur: false,
        sparkles: false,
        goldShine: true,
        holoShine: true,
    },
    low: {
        cards: 'low',
        albumTextures: 'off',
        paper: false,
        shadows: true,
        blur: false,
        sparkles: false,
        goldShine: true,
        holoShine: true,
    },
};

const PRESET_KEYS = [
    'cards',
    'albumTextures',
    'paper',
    'shadows',
    'blur',
    'sparkles',
    'goldShine',
    'holoShine',
] as const satisfies readonly GfxKey[];

const CONTROL_KEYS = ['tapZoom', 'arrows'] as const satisfies readonly GfxKey[];
const BOOLEAN_KEYS = [
    'paper',
    'shadows',
    'blur',
    'sparkles',
    'goldShine',
    'holoShine',
    'tapZoom',
    'arrows',
] as const satisfies readonly GfxKey[];

interface PersistedState {
    version: typeof STORAGE_VERSION;
    preset: GfxPreset;
    settings: GfxSettings;
}

export interface MigratedSettings {
    preset: GfxPreset;
    settings: GfxSettings;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDeviceTier(value: unknown): value is DeviceTier {
    return value === 'high' || value === 'medium' || value === 'low';
}

function isPreset(value: unknown): value is GfxPreset {
    return value === 'auto' || value === 'custom' || isDeviceTier(value);
}

function isCardGraphics(value: unknown): value is CardGraphics {
    return value === 'high' || value === 'medium' || value === 'low' || value === 'border';
}

function isAlbumTextureGraphics(value: unknown): value is AlbumTextureGraphics {
    return value === 'high' || value === 'low' || value === 'off';
}

function readSettings(value: unknown): GfxSettings {
    if (!isRecord(value)) return { ...DEFAULT_SETTINGS };

    const next = { ...DEFAULT_SETTINGS };
    if (isCardGraphics(value.cards)) next.cards = value.cards;
    if (isAlbumTextureGraphics(value.albumTextures)) next.albumTextures = value.albumTextures;

    for (const key of BOOLEAN_KEYS) {
        const stored = value[key];
        if (typeof stored === 'boolean') next[key] = stored;
    }

    return next;
}

/** Apply graphics and animation values while leaving Controls untouched. */
export function applyPreset(base: GfxSettings, tier: DeviceTier): GfxSettings {
    return { ...base, ...PRESETS[tier] };
}

/** Direct Controls changes keep the selected preset; every other change is Custom. */
export function presetAfterDirectChange(current: GfxPreset, key: GfxKey): GfxPreset {
    return (CONTROL_KEYS as readonly GfxKey[]).includes(key) ? current : 'custom';
}

function matchesPreset(settings: GfxSettings, tier: DeviceTier): boolean {
    return PRESET_KEYS.every((key) => settings[key] === PRESETS[tier][key]);
}

function fallbackForDevice(deviceTier: DeviceTier): MigratedSettings {
    return { preset: 'auto', settings: applyPreset(DEFAULT_SETTINGS, deviceTier) };
}

/**
 * Pure persisted-state reader. It accepts the Round 2 flat blob as well as the
 * settings-first shape and ignores malformed values rather than trusting them.
 */
export function migrateStoredSettings(value: unknown, deviceTier: DeviceTier): MigratedSettings {
    if (!isRecord(value)) return fallbackForDevice(deviceTier);

    if ('settings' in value) {
        if (!isPreset(value.preset) || !isRecord(value.settings)) return fallbackForDevice(deviceTier);

        const stored = readSettings(value.settings);
        if (value.preset === 'auto') {
            return { preset: 'auto', settings: applyPreset(stored, deviceTier) };
        }
        if (isDeviceTier(value.preset)) {
            return { preset: value.preset, settings: applyPreset(stored, value.preset) };
        }
        return { preset: 'custom', settings: stored };
    }

    const legacyKeys = [
        'textures', 'renderTier', 'lv2', 'lv3', 'backdrop', 'blur', 'shadows',
        'sparkles', 'tapZoom', 'arrows', 'auto', 'quality',
    ];
    if (!legacyKeys.some((key) => key in value)) return fallbackForDevice(deviceTier);

    const settings = { ...DEFAULT_SETTINGS };
    const legacyTier = value.renderTier === 'light'
        ? 'low'
        : value.renderTier === 'high'
            ? 'high'
            : value.quality === 'light'
                ? 'low'
                : value.quality === 'high'
                    ? 'high'
                    : null;

    if (legacyTier) settings.cards = legacyTier;
    if (typeof value.textures === 'boolean') settings.albumTextures = value.textures ? 'high' : 'off';
    if (typeof value.backdrop === 'boolean') settings.paper = value.backdrop;
    if (typeof value.shadows === 'boolean') settings.shadows = value.shadows;
    if (typeof value.blur === 'boolean') settings.blur = value.blur;
    if (typeof value.sparkles === 'boolean') settings.sparkles = value.sparkles;
    if (typeof value.lv2 === 'boolean') settings.goldShine = value.lv2;
    if (typeof value.lv3 === 'boolean') settings.holoShine = value.lv3;
    if (typeof value.tapZoom === 'boolean') settings.tapZoom = value.tapZoom;
    if (typeof value.arrows === 'boolean') settings.arrows = value.arrows;

    const auto = typeof value.auto === 'boolean' ? value.auto : value.quality === 'auto';
    if (auto) return { preset: 'auto', settings: applyPreset(settings, deviceTier) };

    if (legacyTier && matchesPreset(settings, legacyTier)) {
        return { preset: legacyTier, settings };
    }
    return { preset: 'custom', settings };
}

function readStored(): unknown {
    if (typeof localStorage === 'undefined') return null;
    try {
        const raw = localStorage.getItem(FX_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

const deviceTier = resolveDeviceTier(probeDeviceTier());
const initial = migrateStoredSettings(readStored(), deviceTier);
let settings = initial.settings;
let preset = initial.preset;

const listeners = new Set<() => void>();

export function getSettingsSnapshot(): GfxSettings {
    return settings;
}

export function getPresetSnapshot(): GfxPreset {
    return preset;
}

export function getDeviceTierSnapshot(): DeviceTier {
    return deviceTier;
}

export function subscribeGfx(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function persist() {
    if (typeof localStorage === 'undefined') return;
    const stored: PersistedState = { version: STORAGE_VERSION, preset, settings };
    try {
        localStorage.setItem(FX_KEY, JSON.stringify(stored));
    } catch (err) {
        // Private mode or quota errors only make this session non-persistent.
        if (import.meta.env.DEV) console.warn(`[gfx] Failed to persist collection FX settings: ${FX_KEY}`, stored, err);
    }
}

function notify() {
    listeners.forEach((listener) => listener());
}

export function setPreset(next: SelectableGfxPreset) {
    preset = next;
    settings = applyPreset(settings, next === 'auto' ? deviceTier : next);
    persist();
    notify();
}

export function setGfx<K extends GfxKey>(key: K, value: GfxSettings[K]) {
    if (settings[key] === value) return;
    settings = { ...settings, [key]: value };
    preset = presetAfterDirectChange(preset, key);
    persist();
    notify();
}
