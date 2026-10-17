import { useSyncExternalStore } from "react";

// A shared one-second clock. Reading Date.now() while rendering is impure (and differs between the
// prerender and the browser); this hands the time to React as an external store instead.
const subscribe = (onTick: () => void) => {
    const id = setInterval(onTick, 1000);
    return () => clearInterval(id);
};

// Whole seconds, so React sees the same value until the next tick.
const getNow = () => Math.floor(Date.now() / 1000) * 1000;

// 0 on the server and during hydration: render a time only once it is non-zero.
export function useNow(): number {
    return useSyncExternalStore(subscribe, getNow, () => 0);
}
