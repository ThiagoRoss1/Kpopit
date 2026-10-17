import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { GAME_DAY_CHANGED_EVENT, GameDayContext } from "../contexts/game_day_context";

let refreshCount = 0;

// Keys the mode page by its game day: a new day remounts it instead of reloading the document.
export default function GameDayProvider({ children }: { children: ReactNode }) {
    const [day, setDay] = useState<string | null>(null);

    const onNewDay = useCallback((serverDate: string) => setDay(serverDate), []);
    // The real date isn't known yet: a fresh key refetches the daily data, which reports it.
    const refreshDay = useCallback(() => setDay(`refresh-${++refreshCount}`), []);

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
