import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useRef } from "react";
import { getAllIdols, getUserToken, getUserStats } from "../services/api";
import { encryptToken, decryptToken } from "../utils/tokenEncryption";
import { useTransferDataLogic } from "./useTransferDataLogic";
import type { Users, UserStats, IdolListItem } from "../interfaces/gameInterfaces";
import { useIsMobile } from "./useIsDevice";
import { ALL_IDOLS_KEY, persistingFetch, readPersistedList } from "../utils/persistedList";

export const useSharedGameData = () => {
    // Decided once per mount: only a browser without a stored token asks for a new one
    // (prerender has no storage and must not fetch).
    const [shouldFetchToken] = useState<boolean>(() =>
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
        // One token per browser: never refetched once issued.
        staleTime: Infinity,
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
        return userToken.data.token;
        }

        return null;
    }, [userToken.data]);

    // Ready once the stored token is decrypted (or a new one is stored); the game queries wait on it.
    const tokenReady = useQuery({
        queryKey: ["decryptedUserToken", userToken.data?.token ?? null],
        queryFn: async () => (await initUser()) ?? null,
        enabled: typeof window !== "undefined" && (!!localStorage.getItem("userToken") || !!userToken.data),
        staleTime: Infinity,
        retry: false,
        refetchOnWindowFocus: false,
    });
    const isInitialized = !!tokenReady.data;

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