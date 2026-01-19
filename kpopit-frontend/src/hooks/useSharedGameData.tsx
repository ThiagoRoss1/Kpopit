import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useRef } from "react";
import { getAllIdols, getUserToken, getUserStats } from "../services/api";
import { encryptToken, decryptToken } from "../utils/tokenEncryption";
import { useTransferDataLogic } from "./useTransferDataLogic";
import type { Users, UserStats, IdolListItem } from "../interfaces/gameInterfaces";
import { useIsMobile } from "./useIsDevice";

export const useSharedGameData = () => {
    const [shouldFetchToken, setShouldFetchToken] = useState<boolean>(!localStorage.getItem("userToken"));

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
        try {
            const token = await decryptToken(encrypted);
            decryptedTokenRef.current = token;
            return token;
        } catch (error) {
            console.error("Error decrypting token:", error);
            localStorage.removeItem("userToken");
        }
        }

        if (userToken.data) {
        const encryptedToken = await encryptToken(userToken.data.token);
        localStorage.setItem("userToken", encryptedToken);
        decryptedTokenRef.current = userToken.data.token;
        return userToken.data.token;
        }

        return null;
    }, [userToken.data]);

    useEffect(() => {
        if (userToken.data) {
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
        queryFn: getAllIdols,
        staleTime: 1000 * 60 * 60 * 24 * 5, // See functionality
        gcTime: 1000 * 60 * 60 * 24 * 6, // Can be this the YG error.
        refetchOnWindowFocus: false,
    });

    const userStats = useQuery<UserStats>({
        queryKey: ["userStats", userToken],
        queryFn: async () => getUserStats(await initUser() || ""),
        enabled: !!localStorage.getItem("userToken"),
        refetchOnWindowFocus: false,
    });

    return {
        userToken,
        isMobile,
        initUser,
        decryptedTokenRef,
        allIdolsData,
        isLoadingAllIdols,
        isErrorAllIdols,
        userStatsData: userStats.data,
        transferData,
        queryClient,
    };
}