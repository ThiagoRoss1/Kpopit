import { useEffect } from "react";
import { restoreSession } from "../services/api";
import { applyRestoredSession } from "../utils/applyRestoredSession";
import type { GameModeKey } from "../utils/gameStorage";

// The key each mode keeps its guesses under; empty means this browser has nothing for today.
const GUESSES_KEY: Record<GameModeKey, string> = {
    classic: "todayGuessesDetails",
    blurry: "blurryGuessesDetails",
    pixelated: "pixelatedGuessesDetails",
};

/**
 * With no local guesses for today (first visit on this browser, or cleared storage), asks the
 * server for the day: it records every guess, so a player who still has the token gets it back.
 * Runs once per server date; a guess made meanwhile wins over the response.
 */
export const useServerDayRestore = (
    mode: GameModeKey,
    serverDate: string | undefined,
    initUser: () => Promise<string | null>,
) => {
    useEffect(() => {
        if (!serverDate || localStorage.getItem(GUESSES_KEY[mode])) return;
        let cancelled = false;
        void (async () => {
            const token = await initUser();
            if (!token || cancelled) return;
            try {
                const payload = await restoreSession(token);
                if (cancelled || payload.server_date !== serverDate || localStorage.getItem(GUESSES_KEY[mode])) return;
                applyRestoredSession(payload, [mode]);
            } catch (error) {
                if (import.meta.env.DEV) console.warn("Could not restore today's game from the server:", error);
            }
        })();
        return () => { cancelled = true; };
    }, [mode, serverDate, initUser]);
};
