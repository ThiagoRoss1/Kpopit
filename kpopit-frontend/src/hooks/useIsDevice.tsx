import { useState, useEffect } from "react";

export function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= breakpoint);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [breakpoint]);

    return isMobile;
}

export const isSafari = typeof window !== "undefined" && (
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)));

export const isGeckoEngine = typeof window !== "undefined" && 
  (window.CSS && CSS.supports('-moz-appearance', 'none'));

export function useIsLg(breakpoint = 1024) {
    const [isLg, setIsLg] = useState(window.innerWidth >= breakpoint);

    useEffect(() => {
        const onResize = () => setIsLg(window.innerWidth >= breakpoint);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [breakpoint]);

    return isLg;
}