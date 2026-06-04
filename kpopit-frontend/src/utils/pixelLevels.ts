// Block size per attempt. Larger = more pixelated. 1 = original (full reveal).
export const PIXEL_LEVELS = [
    64,
    36,
    20,
    12,
    8,
    4,
    1,
]

const GetPixelLevel = (attempts: number): number => {
    const lastIndex = PIXEL_LEVELS.length - 1;
    return PIXEL_LEVELS[Math.min(attempts, lastIndex)];
}

export default GetPixelLevel;
