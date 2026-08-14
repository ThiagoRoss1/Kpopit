/** Convert an AnimationEvent timestamp into the performance clock when needed. */
export const DEFAULT_DISCLOSURE_EXIT_MS = 300;

export type DisclosurePhase = 'closed' | 'open' | 'closing';
export interface DisclosureState {
    phase: DisclosurePhase;
    generation: number;
}

export type DisclosureAction =
    | { type: 'open' }
    | { type: 'request-close' }
    | { type: 'finish-close'; expectedGeneration?: number };

export function reduceDisclosureState(state: DisclosureState, action: DisclosureAction): DisclosureState {
    if (action.type === 'open') {
        return { phase: 'open', generation: state.generation + 1 };
    }

    if (action.type === 'request-close') {
        return state.phase === 'open' ? { ...state, phase: 'closing' } : state;
    }

    if (
        state.phase !== 'closing' ||
        (action.expectedGeneration !== undefined &&
            action.expectedGeneration !== state.generation)
    ) {
        return state;
    }

    return {
        phase: state.phase === 'closing' ? 'closed' : state.phase,
        generation: state.generation + 1,
    };
}

export function disclosureCompletionPath(reducedMotion: boolean): 'frame' | 'watchdog' {
    return reducedMotion ? 'frame' : 'watchdog';
}

export function isExpectedDisclosureAnimation(
    animationName: string,
    expectedNames: readonly string[],
): boolean {
    return expectedNames.length === 0 || expectedNames.includes(animationName);
}

export function normalizeAnimationTimestamp(
    eventTimestamp: number,
    currentTime: number,
    timeOrigin = 0,
): number | null {
    if (!Number.isFinite(eventTimestamp) || eventTimestamp <= 0) return null;

    const relativeTimestamp = eventTimestamp > 1_000_000_000_000
        ? eventTimestamp - timeOrigin
        : eventTimestamp;

    // A browser can expose an event timestamp from a different clock. Returning
    // null lets the bounded watchdog remain authoritative instead of trusting a
    // stale event from an unknown clock.
    return Math.abs(relativeTimestamp - currentTime) > 60_000 ? null : relativeTimestamp;
}

/**
 * Reject an animationend queued by an earlier close/reopen cycle. Unknown
 * clocks are rejected so the bounded hook watchdog remains authoritative when
 * the event cannot be trusted.
 */
export function isCurrentAnimationEvent(
    eventTimestamp: number,
    closeRequestedAt: number | null,
    currentTime: number,
    timeOrigin = 0,
): boolean {
    if (closeRequestedAt === null) return true;
    const normalized = normalizeAnimationTimestamp(eventTimestamp, currentTime, timeOrigin);
    return normalized !== null && normalized + 1 >= closeRequestedAt;
}

export function disclosureExitDelay(exitDurationMs: number, marginMs = 100): number {
    const duration = Number.isFinite(exitDurationMs)
        ? Math.max(0, exitDurationMs)
        : DEFAULT_DISCLOSURE_EXIT_MS;
    return duration + marginMs;
}

export function shouldCompleteDisclosureClose({
    closing,
    targetIsOwner,
    eventTimestamp,
    closeRequestedAt,
    currentTime,
    timeOrigin,
}: {
    closing: boolean;
    targetIsOwner: boolean;
    eventTimestamp: number;
    closeRequestedAt: number | null;
    currentTime: number;
    timeOrigin?: number;
}): boolean {
    return closing && targetIsOwner && isCurrentAnimationEvent(
        eventTimestamp,
        closeRequestedAt,
        currentTime,
        timeOrigin,
    );
}
