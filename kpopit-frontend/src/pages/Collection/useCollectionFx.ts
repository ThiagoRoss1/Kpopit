import { useSyncExternalStore } from 'react';
import {
    getDeviceTierSnapshot,
    getPresetSnapshot,
    getSettingsSnapshot,
    setGfx,
    setPreset,
    subscribeGfx,
    type GfxKey,
    type GfxSettings,
} from './collectionFx';

/** Full settings view for roots and the settings panel. */
export function useCollectionFx() {
    const settings = useSyncExternalStore(subscribeGfx, getSettingsSnapshot, getSettingsSnapshot);
    const preset = useSyncExternalStore(subscribeGfx, getPresetSnapshot, getPresetSnapshot);

    return {
        settings,
        preset,
        deviceTier: getDeviceTierSnapshot(),
        setGfx,
        setPreset,
    };
}

/** One setting for leaves that should ignore unrelated graphics changes. */
export function useGfx<K extends GfxKey>(key: K): GfxSettings[K] {
    return useSyncExternalStore(
        subscribeGfx,
        () => getSettingsSnapshot()[key],
        () => getSettingsSnapshot()[key],
    );
}

export type {
    AlbumTextureGraphics,
    CardGraphics,
    GfxKey,
    GfxPreset,
    GfxSettings,
    SelectableGfxPreset,
} from './collectionFx';
