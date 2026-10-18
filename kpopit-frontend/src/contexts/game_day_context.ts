import { createContext, useContext } from "react";
import { safeReload } from "../utils/safeReload";

// The game day a mode page is rendering. Changing it remounts the page (fresh state, storage
// re-read) and re-keys its daily queries, so a new day never needs a page reload.
export interface GameDayValue {
    // null until the page has seen a day change.
    day: string | null;
    // The page found a stored date older than the server's (storage already cleared).
    onNewDay: (serverDate: string) => void;
    // Midnight passed or the server rejected the client's game date: refetch and re-check.
    refreshDay: () => void;
}

export const GAME_DAY_CHANGED_EVENT = "kpopit:game-day-changed";

// The page's daily data re-checks the day on tab focus / visibility and every 30 minutes while
// visible, so a day change (or a test date offset) shows up without F5.
export const DAILY_REFETCH = { refetchOnWindowFocus: "always", refetchInterval: 30 * 60_000 } as const;

export const GameDayContext = createContext<GameDayValue | null>(null);

// Outside a game page there's no day to swap, so fall back to reloading.
const RELOAD: GameDayValue = { day: null, onNewDay: () => safeReload(), refreshDay: () => safeReload() };

export const useGameDay = (): GameDayValue => useContext(GameDayContext) ?? RELOAD;
