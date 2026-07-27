import { useMemo, useState, type AnimationEvent } from 'react';

/**
 * Open/close state for a panel that animates both ways.
 *
 * The element stays mounted through its exit animation (`mounted`) and is only
 * removed once that animation reports back, so React never rips it out mid-flight.
 * `animationProps` carries the `onAnimationEnd` listener that closes the loop —
 * spread it on the element that owns the `-out` keyframes, not on a wrapper.
 */

export interface Disclosure {
    /** Render the element: it is open, or still animating out. */
    mounted: boolean;
    /** Open and not on its way out — use for toggle-button "active" styling. */
    active: boolean;
    /** Exit animation in flight; pick the `-out` class with this. */
    closing: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
    animationProps: { onAnimationEnd: (event: AnimationEvent<Element>) => void };
}

export function useDisclosure(initialOpen = false): Disclosure {
    const [isOpen, setIsOpen] = useState(initialOpen);
    const [closing, setClosing] = useState(false);

    return useMemo(() => {
        const active = isOpen && !closing;

        const open = () => {
            setClosing(false);
            setIsOpen(true);
        };
        // Only starts the exit animation; the unmount happens in onAnimationEnd.
        const close = () => {
            if (active) setClosing(true);
        };

        return {
            mounted: isOpen || closing,
            active,
            closing,
            open,
            close,
            toggle: () => (active ? close() : open()),
            animationProps: {
                // animationend bubbles: a descendant's animation must never unmount us.
                onAnimationEnd: (event: AnimationEvent<Element>) => {
                    if (event.target !== event.currentTarget) return;
                    if (!closing) return;
                    setIsOpen(false);
                    setClosing(false);
                },
            },
        };
    }, [isOpen, closing]);
}
