import { getResetTimer } from "../services/api";
import type { ResetTimer } from "../interfaces/gameInterfaces";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export const useResetTimer = () => {
    const { data, dataUpdatedAt } = useQuery<ResetTimer>({
        queryKey: ['resetTimer'],
        queryFn: getResetTimer,
        staleTime: 1000 * 60 * 10, // 10 minutes
        refetchOnWindowFocus: true,
    });

    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [targetTime, setTargetTime] = useState<number | null>(null);
    const [dayHasChanged, setDayHasChanged] = useState<boolean>(false);

    useEffect(() => {
        if (data?.total_seconds && dataUpdatedAt) {
            const end = dataUpdatedAt + data.total_seconds * 1000;

            setTargetTime((prev) => {
                if (!prev || Math.abs(prev - end) > 2000) {
                    return end;
                }
                return prev;
            });
        }
    }, [data, dataUpdatedAt]);

    useEffect(() => {
        if (!targetTime || dayHasChanged) return;

        const updateTimer = () => {
            const now = Date.now();
            const diff = Math.max(0, Math.floor((targetTime - now) / 1000));

            if (diff <= 0) {
                setDayHasChanged(true);
                window.location.reload();
            }
            setTimeRemaining(diff);
        };

        updateTimer();
        
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [targetTime, dayHasChanged]);

    const hours = timeRemaining !== null ? Math.floor(timeRemaining / 3600) : 0;
    const minutes = timeRemaining !== null ? Math.floor((timeRemaining % 3600) / 60) : 0;
    const seconds = timeRemaining !== null ? timeRemaining % 60 : 0;

    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    return { timeRemaining, formattedTime, dayHasChanged };
};

export default useResetTimer;