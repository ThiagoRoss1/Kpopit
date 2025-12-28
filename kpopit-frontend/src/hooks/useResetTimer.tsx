import { getResetTimer } from "../services/api";
import type { ResetTimer } from "../interfaces/gameInterfaces";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export const useResetTimer = () => {
    const { data } = useQuery<ResetTimer>({
        queryKey: ['resetTimer'],
        queryFn: getResetTimer,
        staleTime: 1000 * 60 * 60,
        refetchOnWindowFocus: false,
    });

    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

    useEffect(() => {
        if (data) {
            const totalSeconds = data?.total_seconds || 0;
            setTimeRemaining(totalSeconds);
        }
    }, [data]);

    useEffect(() => {
        if (timeRemaining === 0) {
            console.log("New day has started, reloading the page.");
            window.location.reload();
            return;
        }
        if (timeRemaining === null || timeRemaining === 0) return;
        
        const interval = setInterval(() => {
            setTimeRemaining(prev => (prev && prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(interval);
    }, [timeRemaining]);

    const hours = timeRemaining !== null ? Math.floor(timeRemaining / 3600) : 0;
    const minutes = timeRemaining !== null ? Math.floor((timeRemaining % 3600) / 60) : 0;
    const seconds = timeRemaining !== null ? timeRemaining % 60 : 0;

    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    return { timeRemaining, formattedTime };
};

export default useResetTimer;