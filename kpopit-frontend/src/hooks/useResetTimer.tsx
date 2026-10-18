import { getResetTimer } from "../services/api";
import type { ResetTimer } from "../interfaces/gameInterfaces";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useGameDay } from "../contexts/game_day_context";
import { useNow } from "./useNow";

type ResetTimerOptions = {
    // Called once when the countdown reaches zero (the game page's day provider uses it).
    onZero?: () => void;
    // The provider passes its own day: it sits above the context it provides.
    day?: string | null;
};

export const useResetTimer = (options: ResetTimerOptions = {}) => {
    const context = useGameDay();
    const day = options.day !== undefined ? options.day : context.day;
    // Keyed by the game day: after a day change the countdown comes from a fresh request.
    const { data, dataUpdatedAt } = useQuery<ResetTimer>({
        queryKey: ['resetTimer', day],
        queryFn: getResetTimer,
        staleTime: 1000 * 60 * 10, // 10 minutes
        refetchOnWindowFocus: true,
    });

    const now = useNow();
    const targetTime = data && dataUpdatedAt ? dataUpdatedAt + data.total_seconds * 1000 : null;
    const timeRemaining = targetTime !== null && now > 0 ? Math.max(0, Math.floor((targetTime - now) / 1000)) : null;
    const dayHasChanged = timeRemaining === 0;

    const { onZero } = options;
    const firedFor = useRef<number | null>(null);
    useEffect(() => {
        if (!dayHasChanged || targetTime === null || firedFor.current === targetTime) return;
        firedFor.current = targetTime;
        onZero?.();
    }, [dayHasChanged, targetTime, onZero]);

    const hours = timeRemaining !== null ? Math.floor(timeRemaining / 3600) : 0;
    const minutes = timeRemaining !== null ? Math.floor((timeRemaining % 3600) / 60) : 0;
    const seconds = timeRemaining !== null ? timeRemaining % 60 : 0;

    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    return { timeRemaining, formattedTime, dayHasChanged };
};

export default useResetTimer;
