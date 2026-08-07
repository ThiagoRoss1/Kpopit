import { useLayoutEffect, type RefObject } from 'react';

export function useSyncAlbumAnimations(ref: RefObject<HTMLElement | null>, dep: unknown): void {
    useLayoutEffect(() => {
        const host = ref.current;
        if (!host) return;
        for (const animation of host.getAnimations({ subtree: true })) {
            if (animation instanceof CSSAnimation && animation.animationName.startsWith('album-')) {
                animation.startTime = 0;
            }
        }
    }, [ref, dep]);
}
