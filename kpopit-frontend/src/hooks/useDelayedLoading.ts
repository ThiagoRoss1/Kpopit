import { useEffect, useRef, useState } from "react";

export const LOADER_DELAY_MS = 300;
export const LOADER_MIN_MS = 500;

// A loader appears only once loading has lasted LOADER_DELAY_MS, then stays at least LOADER_MIN_MS:
// fast loads never flash a spinner, slow ones don't blink it away.
export function useDelayedLoading(loading: boolean): boolean {
    const [visible, setVisible] = useState(false);
    const shownAt = useRef(0);

    useEffect(() => {
        if (loading && !visible) {
            const timer = setTimeout(() => {
                shownAt.current = Date.now();
                setVisible(true);
            }, LOADER_DELAY_MS);
            return () => clearTimeout(timer);
        }
        if (!loading && visible) {
            const left = LOADER_MIN_MS - (Date.now() - shownAt.current);
            const timer = setTimeout(() => setVisible(false), Math.max(0, left));
            return () => clearTimeout(timer);
        }
    }, [loading, visible]);

    return visible;
}
