export type DeviceTier = 'high' | 'medium' | 'low';

export interface DeviceProbe {
    mobile: boolean;
    deviceMemory: number | null;
    cores: number | null;
    coarsePointer: boolean;
    /** iPadOS in desktop mode reports a Macintosh UA but exposes multi-touch. */
    ipadOS: boolean;
}

/** SSR-safe read of the capability signals used by the Auto preset. */
export function probeDeviceTier(): DeviceProbe {
    if (typeof navigator === 'undefined') {
        return { mobile: false, deviceMemory: null, cores: null, coarsePointer: false, ipadOS: false };
    }

    const nav = navigator as Navigator & { deviceMemory?: number };
    const ua = navigator.userAgent || '';
    const touchPoints = typeof navigator.maxTouchPoints === 'number' ? navigator.maxTouchPoints : 0;

    return {
        mobile: /Android|iPhone|iPad|iPod|Mobile/i.test(ua),
        deviceMemory: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
        cores: typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : null,
        coarsePointer: typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches,
        // A Mac UA that also reports touch is really an iPad requesting the desktop site.
        ipadOS: /Macintosh/.test(ua) && touchPoints > 1,
    };
}

/**
 * Pure Auto-preset resolver. Touch devices (real mobile UA or an iPadOS desktop-UA
 * tablet) deliberately top out at Medium — a browser can't query the GPU, so we stay
 * conservative rather than risk the compositing nuke on a device that can't take High.
 */
export function resolveDeviceTier(probe: DeviceProbe): DeviceTier {
    const touchDevice = probe.mobile || probe.ipadOS;

    if (touchDevice) {
        return probe.deviceMemory !== null &&
            probe.deviceMemory >= 8 &&
            probe.cores !== null &&
            probe.cores >= 8
            ? 'medium'
            : 'low';
    }

    // True desktop. Chromium exposes deviceMemory; Safari/Firefox report null.
    if (probe.deviceMemory === null) {
        // Unknown memory: a coarse pointer on a "desktop" is an unusual touch panel —
        // don't hand it the heaviest tier.
        return probe.coarsePointer ? 'medium' : 'high';
    }
    if (probe.deviceMemory >= 8) return 'high';
    if (probe.deviceMemory >= 4) return 'medium';
    return 'low';
}
