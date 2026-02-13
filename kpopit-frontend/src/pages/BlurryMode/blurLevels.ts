export const BLUR_LEVELS = [
    24,
    18,
    14,
    10,
    8,
    5,
    4,
    2,
    2,
    1,
    1,
    1,
    0,
]

const GetBlurLevel = (attempts: number): number => {
    const lastIndex = BLUR_LEVELS.length - 1;
    return BLUR_LEVELS[Math.min(attempts, lastIndex)];
}

export default GetBlurLevel;