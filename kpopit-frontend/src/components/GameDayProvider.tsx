import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GAME_DAY_CHANGED_EVENT, GameDayContext } from "../contexts/game_day_context";
import { useResetTimer } from "../hooks/useResetTimer";

// Keys the mode page by its game day: a new day remounts it instead of reloading the document.
export default function GameDayProvider({ children }: { children: ReactNode }) {
    const [day, setDay] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const onNewDay = useCallback((serverDate: string) => setDay(serverDate), []);
    // Refetching the page's data is enough: a new server_date sends the page through onNewDay.
    const refreshDay = useCallback(() => {
        void queryClient.invalidateQueries();
    }, [queryClient]);

    // Midnight, kept running for as long as a game page is open (not only while a card shows it).
    useResetTimer({ day, onZero: refreshDay });

    useEffect(() => {
        window.addEventListener(GAME_DAY_CHANGED_EVENT, refreshDay);
        return () => window.removeEventListener(GAME_DAY_CHANGED_EVENT, refreshDay);
    }, [refreshDay]);

    const value = useMemo(() => ({ day, onNewDay, refreshDay }), [day, onNewDay, refreshDay]);

    return (
        <GameDayContext.Provider value={value}>
            <Fragment key={day ?? "first"}>{children}</Fragment>
        </GameDayContext.Provider>
    );
}
