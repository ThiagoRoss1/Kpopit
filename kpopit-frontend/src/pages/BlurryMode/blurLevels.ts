export const BLUR_LEVELS = [
    30,
    26,
    22,
    18,
    14,
    12,
    10,
    8,
    6,
    4,
    3,
    2,
    1,
    0,
]

const GetBlurLevel = (attempts: number): number => {
    const lastIndex = BLUR_LEVELS.length - 1;
    return BLUR_LEVELS[Math.min(attempts, lastIndex)];
}

export default GetBlurLevel;