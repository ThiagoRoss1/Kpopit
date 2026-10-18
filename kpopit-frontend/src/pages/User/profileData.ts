import { queryOptions } from "@tanstack/react-query";
import { getUserStats } from "../../services/api";
import { getQueryClient } from "../../services/queryClient";
import { decryptToken } from "../../utils/tokenEncryption";
import { sessionReady } from "../../utils/sessionMarker";
import type { UserStats } from "../../interfaces/gameInterfaces";

export interface CombinedStats {
    classic: UserStats;
    blurry: UserStats;
    pixelated: UserStats;
}

const GAMEMODE_IDS = { classic: 1, blurry: 2, pixelated: 3 } as const;

const fetchAllModeStats = async (userToken: string): Promise<CombinedStats> => {
    const [classic, blurry, pixelated] = await Promise.all([
        getUserStats(userToken, GAMEMODE_IDS.classic) as Promise<UserStats>,
        getUserStats(userToken, GAMEMODE_IDS.blurry) as Promise<UserStats>,
        getUserStats(userToken, GAMEMODE_IDS.pixelated) as Promise<UserStats>,
    ]);
    return { classic, blurry, pixelated };
};

// Shared by the profile page and its route clientLoader.
export const profileStatsQuery = (userToken: string) => queryOptions({
    queryKey: ["userProfileStats", userToken],
    queryFn: () => fetchAllModeStats(userToken),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
});

// The stored game token, decrypted once and remembered, so the page can start from it.
let decrypted: { encrypted: string; token: string } | null = null;

export async function readUserToken(): Promise<string | null> {
    const encrypted = localStorage.getItem("userToken");
    if (!encrypted) return null;
    if (decrypted?.encrypted === encrypted) return decrypted.token;
    try {
        const token = await decryptToken(encrypted);
        decrypted = { encrypted, token };
        return token;
    } catch {
        return null;
    }
}

// null: no stored token; undefined: not decrypted yet.
export function rememberedUserToken(): string | null | undefined {
    const encrypted = localStorage.getItem("userToken");
    if (!encrypted) return null;
    return decrypted?.encrypted === encrypted ? decrypted.token : undefined;
}

// For the route loader: null while the session is unknown (the page then loads the stats itself).
export function loadProfileStats(): Promise<CombinedStats | null> | null {
    if (!sessionReady()) return null;
    return readUserToken().then((token) => (token ? getQueryClient().ensureQueryData(profileStatsQuery(token)) : null));
}
