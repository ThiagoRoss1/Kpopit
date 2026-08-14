import { useLayoutEffect, type RefObject } from 'react';
import { isSafariAlbumEngine } from '../../../../hooks/useIsDevice';

/**
 * Preserve the established Chromium/Firefox clone-clock behavior. Safari skips
 * this Web Animations mutation and uses the CSS phase hook instead; rewriting
 * WebKit animation startTime during leaf promotion is the source of the Safari
 * held-treatment failure documented in the handoff.
 */
export function useSyncAlbumAnimations(ref: RefObject<HTMLElement | null>, dep: unknown): void {
    useLayoutEffect(() => {
        if (isSafariAlbumEngine) return;
        const host = ref.current;
        if (!host) return;
        for (const animation of host.getAnimations({ subtree: true })) {
            if (animation instanceof CSSAnimation && animation.animationName.startsWith('album-')) {
                animation.startTime = 0;
            }
        }
    }, [ref, dep]);
}
