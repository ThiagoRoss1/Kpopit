import { useSyncExternalStore, useCallback } from 'react';
import {
    FX_GROUPS, getFxSnapshot, setFx, setFxGroup, subscribeFx,
    type FxGroup, type FxKey, type FxState,
} from './collectionFx';

/** Full state + setters. For the panel. */
export function useCollectionFx() {
    const fx = useSyncExternalStore(subscribeFx, getFxSnapshot, getFxSnapshot);

    const groupOn = useCallback((group: FxGroup) => {
        return FX_GROUPS[group].some((key) => fx[key]);
    }, [fx]);

    return { fx, setFx, setFxGroup, groupOn };
}

/** One flag. For leaves that must not re-render on unrelated changes. */
export function useFx(key: FxKey): boolean {
    return useSyncExternalStore(
        subscribeFx,
        () => getFxSnapshot()[key],
        () => getFxSnapshot()[key],
    );
}

export type { FxGroup, FxKey, FxState };
