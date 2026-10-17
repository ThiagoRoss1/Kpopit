import { useCallback, useSyncExternalStore } from "react";
import { isSafariUserAgent } from './safariDetection';

// Prerender and hydration have no viewport: both hooks report false there, then the real value.
export function useIsMobile(breakpoint = 768) {
    const subscribe = useCallback((onChange: () => void) => {
        window.addEventListener("resize", onChange);
        return () => window.removeEventListener("resize", onChange);
    }, []);

    return useSyncExternalStore(subscribe, () => window.innerWidth <= breakpoint, () => false);
}

// Keep the broad historical flag for existing site-wide consumers. In
// particular, iOS Chrome/Firefox are WebKit shells and previously matched this
// value; changing it would alter unrelated victory-card and album-page logic.
export const isSafari = typeof window !== "undefined" && (
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent))
);

// Exact gate for the Safari-only album compositor experiment. This deliberately
// excludes CriOS/FxiOS/other iOS browser shells so the workaround cannot leak
// into unrelated non-Safari paths.
export const isSafariAlbumEngine = typeof window !== "undefined" && isSafariUserAgent(navigator.userAgent, navigator.maxTouchPoints);

export const isGeckoEngine = typeof window !== "undefined" && 
  (window.CSS && CSS.supports('-moz-appearance', 'none'));

export function useIsLg(breakpoint = 1024) {
    const query = `(min-width: ${breakpoint}px)`;
    const subscribe = useCallback((onChange: () => void) => {
        const mediaQuery = window.matchMedia(query);
        mediaQuery.addEventListener("change", onChange);
        return () => mediaQuery.removeEventListener("change", onChange);
    }, [query]);

    return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}
