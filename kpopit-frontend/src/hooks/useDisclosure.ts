import { useCallback, useEffect, useMemo, useRef, useState, type AnimationEvent } from 'react';
import {
    DEFAULT_DISCLOSURE_EXIT_MS,
    disclosureCompletionPath,
    disclosureExitDelay,
    isExpectedDisclosureAnimation,
    reduceDisclosureState,
    shouldCompleteDisclosureClose,
    type DisclosureState,
} from './disclosureTiming';

/**
 * Open/close state for a panel that animates both ways.
 *
 * The element stays mounted through its exit animation (`mounted`). Its own
 * `animationend` normally unmounts it; reduced motion and a bounded watchdog
 * guarantee completion when CSS cannot emit that event. Spread `animationProps`
 * on the element that owns the `-out` keyframes, not on a wrapper.
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

export interface DisclosureOptions {
    initialOpen?: boolean;
    /** Must match the owning element's CSS exit animation duration. */
    exitDurationMs?: number;
    /** Animation names emitted by the closing owner; empty accepts any owner animation. */
    exitAnimationNames?: readonly string[];
}

const EXIT_WATCHDOG_MARGIN_MS = 100;
const EMPTY_EXIT_ANIMATIONS: readonly string[] = [];

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const reducedMotionPreferred = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Keeps exit animations presentational rather than responsible for correctness.
 * The owner's animationend is the normal completion signal; reduced motion and
 * a bounded watchdog cover cases where CSS cannot emit that signal.
 */
export function useDisclosure(options: DisclosureOptions = {}): Disclosure {
    const {
        initialOpen = false,
        exitDurationMs = DEFAULT_DISCLOSURE_EXIT_MS,
        exitAnimationNames = EMPTY_EXIT_ANIMATIONS,
    } = options;
    const [state, setState] = useState<DisclosureState>(() => ({
        phase: initialOpen ? 'open' : 'closed',
        generation: 0,
    }));
    const stateRef = useRef<DisclosureState>(state);
    const closeRequestedAt = useRef<number | null>(null);

    const finishClose = useCallback((expectedGeneration?: number) => {
        const current = stateRef.current;
        const next = reduceDisclosureState(current, { type: 'finish-close', expectedGeneration });
        if (next === current) return;

        stateRef.current = next;
        if (next.phase === 'closed' && current.phase === 'closing') closeRequestedAt.current = null;
        setState(next);
    }, []);

    const open = useCallback(() => {
        // A reopened disclosure must not be closed by the previous exit's event,
        // next-paint task, or watchdog.
        const current = stateRef.current;
        if (current.phase === 'open') return;
        const next = reduceDisclosureState(current, { type: 'open' });
        closeRequestedAt.current = null;
        if (next === current) return;

        stateRef.current = next;
        setState(next);
    }, []);

    const close = useCallback(() => {
        const current = stateRef.current;
        const next = reduceDisclosureState(current, { type: 'request-close' });
        if (next.phase === 'closing' && current.phase !== 'closing') closeRequestedAt.current = now();
        if (next === current) return;

        stateRef.current = next;
        setState(next);
    }, []);

    const toggle = useCallback(() => {
        if (stateRef.current.phase === 'open') close();
        else open();
    }, [close, open]);

    useEffect(() => {
        if (state.phase !== 'closing') return;

        const generation = state.generation;

        if (disclosureCompletionPath(reducedMotionPreferred()) === 'frame') {
            const frame = requestAnimationFrame(() => finishClose(generation));
            return () => cancelAnimationFrame(frame);
        }

        const watchdog = window.setTimeout(
            () => finishClose(generation),
            disclosureExitDelay(exitDurationMs, EXIT_WATCHDOG_MARGIN_MS),
        );

        return () => window.clearTimeout(watchdog);
    }, [exitDurationMs, finishClose, state.generation, state.phase]);

    return useMemo(() => {
        const active = state.phase === 'open';
        const closing = state.phase === 'closing';
        const generation = state.generation;

        return {
            mounted: state.phase !== 'closed',
            active,
            closing,
            open,
            close,
            toggle,
            animationProps: {
                // animationend bubbles: a descendant's animation must never unmount us.
                onAnimationEnd: (event: AnimationEvent<Element>) => {
                    if (!shouldCompleteDisclosureClose({
                        closing,
                        targetIsOwner: event.target === event.currentTarget,
                        eventTimestamp: event.timeStamp,
                        closeRequestedAt: closeRequestedAt.current,
                        currentTime: now(),
                        timeOrigin: typeof performance !== 'undefined' ? performance.timeOrigin : 0,
                    })) return;
                    if (!isExpectedDisclosureAnimation(event.animationName, exitAnimationNames)) return;
                    finishClose(generation);
                },
            },
        };
    }, [close, exitAnimationNames, finishClose, open, state.generation, state.phase, toggle]);
}
