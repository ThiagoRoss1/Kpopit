// Per-mode localStorage keys and the new-day rules, kept free of React and of the global
// `localStorage` so they can be unit-tested with any Storage-like object.

export type GameModeKey = "classic" | "blurry" | "pixelated";

/** The slice of the Web Storage API these helpers use. */
export type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const CLASSIC_KEYS = [
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

export const BLURRY_KEYS = [
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

export const PIXELATED_KEYS = [
    "pixelatedGuessesDetails",
    "pixelatedGuessedAlbums",
    "pixelatedGameComplete",
    "pixelatedGameWon",
    "pixelatedAnimatedAlbums",
    "pixelatedHint1Revealed",
    "pixelatedHint2Revealed",
    "confettiShownPixelated",
    "pixelatedGameDate",
] as const;

export const MODE_KEYS: Record<GameModeKey, readonly string[]> = {
    classic: CLASSIC_KEYS,
    blurry: BLURRY_KEYS,
    pixelated: PIXELATED_KEYS,
};

/** Key holding the server date each mode last saw. */
export const GAME_DATE_KEY: Record<GameModeKey, string> = {
    classic: "gameDate",
    blurry: "blurryGameDate",
    pixelated: "pixelatedGameDate",
};

/** Removes the mode's keys one by one (never a blind clear). */
export const clearModeKeys = (storage: KeyValueStorage, mode: GameModeKey): void => {
    MODE_KEYS[mode].forEach(key => storage.removeItem(key));
};

/** True when the server's date differs from the one the mode last stored (includes a first visit). */
export const isNewGameDay = (storage: KeyValueStorage, mode: GameModeKey, serverDate: string): boolean =>
    storage.getItem(GAME_DATE_KEY[mode]) !== serverDate;

/**
 * First visit (no stored date): records today's date and returns true. Nothing is reset or
 * reloaded; leftover keys without a date are dropped first. Returns false once a date exists.
 */
export const startFirstGameDay = (storage: KeyValueStorage, mode: GameModeKey, serverDate: string): boolean => {
    if (storage.getItem(GAME_DATE_KEY[mode]) !== null) return false;
    clearModeKeys(storage, mode);
    storage.setItem(GAME_DATE_KEY[mode], serverDate);
    return true;
};
