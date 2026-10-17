import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useRef } from "react";
import { getAllIdols, getUserToken, getUserStats } from "../services/api";
import { encryptToken, decryptToken } from "../utils/tokenEncryption";
import { useTransferDataLogic } from "./useTransferDataLogic";
import type { Users, UserStats, IdolListItem } from "../interfaces/gameInterfaces";
import { useIsMobile } from "./useIsDevice";
import { ALL_IDOLS_KEY, persistingFetch, readPersistedList } from "../utils/persistedList";

export const useSharedGameData = () => {
    const [isInitialized, setIsInitialized] = useState<boolean>(false);
    // Prerender has no storage and must not fetch; the browser decides on its first render.
    const [shouldFetchToken, setShouldFetchToken] = useState<boolean>(() =>
        typeof window !== "undefined" && !localStorage.getItem("userToken"));

    // Is mobile
    const isMobile = useIsMobile(); 
    // Transfer data logic hook
    const transferData = useTransferDataLogic();
    // Api-side 
    const queryClient = useQueryClient();

    const decryptedTokenRef = useRef<string | null>(null);

    // User token
    const userToken = useQuery<Users>({
        enabled: shouldFetchToken,
        queryKey: ["userToken"],
        queryFn: getUserToken,
        refetchOnWindowFocus: false,
    });

    // Init user
    const initUser = useCallback(async () => {
        if (decryptedTokenRef.current) return decryptedTokenRef.current;

        const encrypted = localStorage.getItem("userToken");

        if (encrypted) {
            const RETRY_DELAYS = [50, 100, 200, 400];
            const MAX_ATTEMPTS = RETRY_DELAYS.length;
            let lastError: unknown = null;

            for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
                try {
                    const token = await decryptToken(encrypted);
                    decryptedTokenRef.current = token;
                    setIsInitialized(true);
                    return token;
                } catch (error) {
                    lastError = error;
                    if (attempt < MAX_ATTEMPTS - 1) {
                        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
                    }
                }
            }

            console.error("Error decrypting token after retries:", lastError);
            localStorage.removeItem("userToken");
        }

        if (userToken.data) {
        const encryptedToken = await encryptToken(userToken.data.token);
        localStorage.setItem("userToken", encryptedToken);
        decryptedTokenRef.current = userToken.data.token;
        setIsInitialized(true);
        return userToken.data.token;
        }

        return null;
    }, [userToken.data]);

    useEffect(() => {
        if (localStorage.getItem("userToken") || userToken.data) {
        initUser();
        setShouldFetchToken(false);
        }
    }, [initUser, userToken.data]);

    // All idols list
    const {
        data: allIdolsData,
        isLoading: isLoadingAllIdols,
        isError: isErrorAllIdols,
    } = useQuery<IdolListItem[]>({
        queryKey: ["allIdols"],
        queryFn: persistingFetch(ALL_IDOLS_KEY, getAllIdols),
        // Last visit's copy shows at once and counts as stale, so each visit refreshes it once.
        initialData: () => readPersistedList<IdolListItem>(ALL_IDOLS_KEY),
        initialDataUpdatedAt: 0,
        staleTime: 1000 * 60 * 60 * 24 * 5, // See functionality
        gcTime: 1000 * 60 * 60 * 24 * 6, // Can be this the YG error.
        refetchOnWindowFocus: false,
    });

    const userStats = useQuery<UserStats>({
        queryKey: ["userStats", userToken.data?.id],
        queryFn: async () => getUserStats(await initUser() || ""),
        enabled: typeof window !== "undefined" && !!localStorage.getItem("userToken"),
        refetchOnWindowFocus: false,
    });

    return {
        userToken,
        isMobile,
        initUser,
        isInitialized,
        decryptedTokenRef,
        allIdolsData,
        isLoadingAllIdols,
        isErrorAllIdols,
        userStatsData: userStats.data,
        transferData,
        queryClient,
    };
}