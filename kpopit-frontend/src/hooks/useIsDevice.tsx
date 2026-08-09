import { useState, useEffect } from "react";
import { isSafariUserAgent } from './safariDetection';

export function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= breakpoint);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [breakpoint]);

    return isMobile;
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
    const [isLg, setIsLg] = useState(() => window.matchMedia(`(min-width: ${breakpoint}px)`).matches);

    useEffect(() => {
        const mediaQuery = window.matchMedia(`(min-width: ${breakpoint}px)`);
        const handleChange = (event: MediaQueryListEvent) => {
            setIsLg(event.matches);
        }

        mediaQuery.addEventListener("change", handleChange);

        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [breakpoint]);

    return isLg;
}
