import type { CSSProperties } from 'react';

export function animationDelayAt(timestampMs: number): string {
    return `-${timestampMs}ms`;
}

export function animationPhaseStyleAt(timestampMs: number, enabled: boolean): CSSProperties {
    return enabled ? ({ '--album-animation-delay': animationDelayAt(timestampMs) } as CSSProperties) : {};
}
