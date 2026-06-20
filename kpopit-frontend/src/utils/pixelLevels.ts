// Block size per attempt. Larger = more pixelated. 1 = original (full reveal).
export const PIXEL_LEVELS = [
    200,
    160,
    120,
    100,
    60,
    50,
    40,
    30,
    20,
    15,
    10,
    1,
]

export const SATURATION_LEVELS = [
    20,
    60,
    80,
    100,
]

// Reference resolution (px per axis) that `blockSize` is measured against.
// The mosaic grid is MOSAIC_BASE / blockSize, derived from this FIXED base
// instead of the on-screen canvas — so the pixelation for a given attempt is
// identical on every screen size and devicePixelRatio (the daily puzzle is the
// same difficulty for everyone). Tune the difficulty curve here or in
// PIXEL_LEVELS; nothing in the canvas needs to change.
export const MOSAIC_BASE = 1000;

export const blockSizeToGrid = (blockSize: number): number =>
    Math.max(1, Math.round(MOSAIC_BASE / blockSize));

const GetPixelLevel = (attempts: number): number => {
    const lastIndex = PIXEL_LEVELS.length - 1;
    return PIXEL_LEVELS[Math.min(attempts, lastIndex)];
}

const GetSaturationLevel = (attempts: number): number => {
    const lastIndex = SATURATION_LEVELS.length - 1;
    return SATURATION_LEVELS[Math.min(attempts, lastIndex)];
}

export { GetPixelLevel, GetSaturationLevel };
