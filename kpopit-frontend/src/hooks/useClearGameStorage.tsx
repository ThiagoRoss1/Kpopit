import { useCallback } from "react";

const CLASSIC_KEYS = [
    "todayGuessesDetails",
    "GuessedIdols",
    "gameComplete",
    "gameWon",
    "hint1Revealed",
    "showHint1",
    "colorize1",
    "hint2Revealed",
    "showHint2",
    "colorize2",
    "animatedIdols",
    "closeFeedbackSquares",
    "confettiShown",
    "gameDate",
] as const;

const BLURRY_KEYS = [
    "blurryGuessesDetails",
    "blurryGuessedIdols",
    "blurryGameComplete",
    "blurryGameWon",
    "blurryHardcoreMode",
    "blurryColorMode",
    "blurryHintClicked",
    "blurryAnimatedIdols",
    "confettiShownBlurry",
    "blurryGameDate",
] as const;

const PIXELATED_KEYS = [
    "pixelatedGuessesDetails",
    "pixelatedGuessedAlbums",
    "pixelatedGameComplete",
    "pixelatedGameWon",
    "confettiShownPixelated",
    "pixelatedGameDate",
] as const;

export const useClearGameStorage = () => {
    const clearClassic = useCallback(() => {
        CLASSIC_KEYS.forEach(k => localStorage.removeItem(k));
    }, []);

    const clearBlurry = useCallback(() => {
        BLURRY_KEYS.forEach(k => localStorage.removeItem(k));
    }, []);

    const clearPixelated = useCallback(() => {
        PIXELATED_KEYS.forEach(k => localStorage.removeItem(k));
    }, []);

    const clearAll = useCallback(() => {
        clearClassic();
        clearBlurry();
        clearPixelated();
    }, [clearClassic, clearBlurry, clearPixelated]);

    return { clearClassic, clearBlurry, clearPixelated, clearAll };
};
