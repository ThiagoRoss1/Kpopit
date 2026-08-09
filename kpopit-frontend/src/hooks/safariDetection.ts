const IOS_BROWSER_SHELL_PATTERN = /(?:crios|fxios|edgios|opios|gsa)/i;

/**
 * Identify Safari itself without treating another iOS browser shell as Safari.
 * iPadOS desktop-mode Safari keeps a Macintosh UA, so touch points are part of
 * the fallback check for that specific WebKit presentation.
 */
export function isSafariUserAgent(userAgent: string, maxTouchPoints = 0): boolean {
    const isIosBrowserShell = IOS_BROWSER_SHELL_PATTERN.test(userAgent);
    if (isIosBrowserShell) return false;

    const isDesktopSafari = /safari/i.test(userAgent) && !/(?:chrome|android)/i.test(userAgent);
    const isIpadDesktopSafari = maxTouchPoints > 1 && /Macintosh/.test(userAgent);
    return isDesktopSafari || isIpadDesktopSafari;
}
