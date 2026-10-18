import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// False on the server and during hydration, true afterwards: render browser-only values only
// once this is true, so the first client render matches the prerendered HTML.
export function useHydrated(): boolean {
    return useSyncExternalStore(subscribe, () => true, () => false);
}
