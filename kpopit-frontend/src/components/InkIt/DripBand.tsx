import { useEffect, useMemo, useRef, useState } from "react";

interface Drip {
    left: number;
    top: number;
    width: number;
    height: number;
    radius: string;
}

const MOBILE_BELOW = 900;

// Seeded, so the band is the same on every load at a given width.
const seededRandom = (seed: number) => {
    let state = seed;

    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
        mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;

        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
};

/** Drips across `width`: longer toward the sides, shorter in the centre, some with a loose drop. */
const buildDrips = (width: number): Drip[] => {
    const isMobile = width < MOBILE_BELOW;
    const random = seededRandom(41);
    const drips: Drip[] = [];
    let x = 18;

    while (x < width - 14) {
        const fromCentre = Math.pow(Math.abs(x - width / 2) / (width / 2), 1.5);
        const dripWidth = 6 + random() * 4;
        const height = Math.max(dripWidth * 0.9, 5 + random() * random() * (8 + fromCentre * (isMobile ? 16 : 22)));

        drips.push({ left: x - 2.5, top: 2, width: dripWidth + 5, height: 7, radius: "0 0 50% 50%" });
        drips.push({ left: x, top: 3, width: dripWidth, height, radius: "0 0 999px 999px" });

        if (fromCentre > 0.25 && height > 14 && random() < 0.5) {
            const drop = dripWidth * 0.62;

            drips.push({ left: x + (dripWidth - drop) / 2, top: height + 8, width: drop, height: drop * 1.15, radius: "50%" });
        }

        x += (isMobile ? 30 : 46) + random() * (isMobile ? 40 : 80);
    }

    return drips;
};

/** The pink band under the navbar, running down in drips. */
const DripBand = () => {
    const bandRef = useRef<HTMLDivElement | null>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const band = bandRef.current;
        if (!band) return;

        const observer = new ResizeObserver(() => setWidth(Math.round(band.getBoundingClientRect().width)));
        observer.observe(band);

        return () => observer.disconnect();
    }, []);

    const drips = useMemo(() => (width > 0 ? buildDrips(width) : []), [width]);

    return (
        <div ref={bandRef} aria-hidden className="relative z-3 h-0">
            <div className="pointer-events-none absolute inset-x-0 -top-0.5 h-12 overflow-hidden">
                <div className="inkit-drips absolute inset-0">
                    <div className="h-1.5 bg-[#FF8AC4]" />

                    {drips.map((drip, index) => (
                        <span
                            key={index}
                            style={{ left: drip.left, top: drip.top, width: drip.width, height: drip.height, borderRadius: drip.radius }}
                            className="absolute bg-[#FF8AC4]"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DripBand;
