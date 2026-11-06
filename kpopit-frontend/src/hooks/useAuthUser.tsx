import { registerUser, claimUser, loginUser, authError, logoutUser, refreshToken, restoreSession, sendVerificationEmail } from "../services/api"
import type { LoginData, RegisterData } from "../interfaces/authInterfaces"
import { decryptToken, encryptToken } from "../utils/tokenEncryption"
import { clearAccessToken, setAccessToken } from "../services/tokenStore"
import { useClearGameStorage } from "./useClearGameStorage"
import { applyRestoredSession } from "../utils/applyRestoredSession"
import { useQueryClient } from "@tanstack/react-query"

const PUBLIC_QUERY_KEYS = new Set([
    "features", "allIdols", "allAlbums",
    "idolsPageData", "idolProfileData", "albumsPageData", "albumPageData",
]);

const extractBackendError = (error: unknown, fallback: string) => {
    if (authError(error)) return error.response.data.error;
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}

export const useAuthUser = () => {
    const { clearAll } = useClearGameStorage();
    const queryClient = useQueryClient();

    const clearViewerCache = async () => {
        const viewerQueries = {
            predicate: (query: { queryKey: readonly unknown[] }) => !PUBLIC_QUERY_KEYS.has(String(query.queryKey[0])),
        };

        // Yesterday's answers and dated games depend on who is viewing them, even on the same day.
        await queryClient.cancelQueries(viewerQueries);
        queryClient.removeQueries(viewerQueries);
    };

    const hydrateAuthenticatedSession = async () => {
        clearAll();
        await clearViewerCache();
        try {
            const restored = await restoreSession();
            applyRestoredSession(restored);
        } catch (err) {
            console.warn("Failed to restore game session:", err);
        }
    };

    const register = async (data: RegisterData) => {
        try {
            const encrypted = localStorage.getItem('userToken');

            if (encrypted) {
                const token = await decryptToken(encrypted);
                const response = await claimUser(token, data.username, data.email, data.password);
                setAccessToken(response.access_token);
                localStorage.setItem('kpopit_session', 'true');
                localStorage.setItem('kpopit_was_authenticated', 'true');

                if (response.user?.user_token) {
                    const encryptedToken = await encryptToken(response.user.user_token);
                    localStorage.setItem('userToken', encryptedToken);
                }
                await hydrateAuthenticatedSession();

                try {
                    if (response.user?.email) {
                        await sendVerificationEmail();
                    }
                } catch (error) {
                    console.warn("Failed to send verification email:", error);
                }

                return response;
            } else {
                const response = await registerUser(data.username, data.email, data.password);
                setAccessToken(response.access_token);
                localStorage.setItem('kpopit_session', 'true');
                localStorage.setItem('kpopit_was_authenticated', 'true');

                if (response.user?.user_token) {
                    const encryptedToken = await encryptToken(response.user.user_token);
                    localStorage.setItem('userToken', encryptedToken);
                }

                await hydrateAuthenticatedSession();

                try {
                    if (response.user?.email) {
                        await sendVerificationEmail();
                    }
                } catch (error) {
                    console.warn("Failed to send verification email:", error);
                }
                
                return response;
            }
        } catch (error) {
            throw new Error(extractBackendError(error, "Registration failed"), { cause: error });
        }
    }

    const login = async (data: LoginData) => {
        try {
            const response = await loginUser(data.identifier, data.password, data.rememberMe);
            setAccessToken(response.access_token);
            localStorage.setItem('kpopit_was_authenticated', 'true');

            if (data.rememberMe) {
                localStorage.setItem('kpopit_session', 'true');
                sessionStorage.removeItem('kpopit_session');
            } else {
                sessionStorage.setItem('kpopit_session', 'true');
                localStorage.removeItem('kpopit_session');
            }

            if (response.user?.user_token) {
                const encryptedToken = await encryptToken(response.user.user_token);
                localStorage.setItem('userToken', encryptedToken);
            }

            await hydrateAuthenticatedSession();
            return response;
        } catch (error) {
            throw new Error(extractBackendError(error, "Login failed"), { cause: error });
        }
    }

    const logout = async () => {
        try {
            const response = await logoutUser();
            clearAccessToken();
            localStorage.removeItem('kpopit_session');
            sessionStorage.removeItem('kpopit_session');
            localStorage.removeItem('userToken');
            localStorage.removeItem('kpopit_was_authenticated');
            clearAll();
            await clearViewerCache();
            return response;
        } catch (error) {
            throw new Error(extractBackendError(error, "Logout failed"), { cause: error });
        }
    }

    // The server already ended every session (e.g. account deletion): drop the local one. The
    // sticky kpopit_was_authenticated marker stays, so the next restore wipes the game token too.
    const endLocalSession = () => {
        clearAccessToken();
        localStorage.removeItem('kpopit_session');
        sessionStorage.removeItem('kpopit_session');
    }

    const refresh = async () => {
        try {
            return await refreshToken();
        } catch (error) {
            throw new Error(extractBackendError(error, "Token refresh failed"), { cause: error });
        }
    }

    return {
        register,
        login,
        logout,
        endLocalSession,
        refresh
    }
}
