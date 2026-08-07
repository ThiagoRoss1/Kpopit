import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext, type AuthState } from "./auth_context";
import { getMe, refreshToken, restoreSession as restoreGameSession, isTimeoutError } from "../services/api";
import { setAccessToken, clearAccessToken } from "../services/tokenStore";
import { useClearGameStorage } from "../hooks/useClearGameStorage";
import { applyRestoredSession } from "../utils/applyRestoredSession";

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [state, setState] = useState<AuthState>({
        isAuthenticated: false,
        isLoading: true,
        user: null,
    });

    const { clearAll } = useClearGameStorage();
    const clearAllRef = useRef(clearAll);
    clearAllRef.current = clearAll;

    const queryClient = useQueryClient();

    const cancelledRef = useRef(false);
    const isRefreshingRef = useRef(false);

    const restoreSession = useCallback(async () => {
        if (isRefreshingRef.current) return;

        const hadSession =
            localStorage.getItem('kpopit_session') ??
            sessionStorage.getItem('kpopit_session');
        if (!hadSession) {
            const wasAuthenticated = localStorage.getItem('kpopit_was_authenticated') === 'true';
            if (wasAuthenticated) {
                localStorage.removeItem('userToken');
                localStorage.removeItem('kpopit_was_authenticated');
                clearAllRef.current();
            }
            setState({ isAuthenticated: false, isLoading: false, user: null });
            return;
        }

        isRefreshingRef.current = true;

        try {
            const data = await refreshToken();
            setAccessToken(data.access_token);

            const me = await getMe();

            if (cancelledRef.current) return;

            try {
                const gameSession = await restoreGameSession();
                if (cancelledRef.current) return;
                applyRestoredSession(gameSession);
            } catch (err) {
                if (import.meta.env.DEV) {
                    console.warn("Failed to restore game session after auth refresh:", err);
                }
            }

            setState({ isAuthenticated: true, isLoading: false, user: me });
        } catch (err) {
            if (isTimeoutError(err)) {
                clearAccessToken();
                if (cancelledRef.current) return;
                setState({ isAuthenticated: false, isLoading: false, user: null });
                return;
            }

            const wasAuthenticated = localStorage.getItem('kpopit_was_authenticated') === 'true';
            clearAccessToken();
            localStorage.removeItem('kpopit_session');
            sessionStorage.removeItem('kpopit_session');
            if (wasAuthenticated) {
                // Only wipe the anonymous UUID + game state if the user actually
                // had a real session. A pure anonymous user whose refresh just
                // happened to fail should keep their UUID and local progress.
                localStorage.removeItem('userToken');
                localStorage.removeItem('kpopit_was_authenticated');
                clearAllRef.current();
            }
            if (cancelledRef.current) return;

            setState({ isAuthenticated: false, isLoading: false, user: null });
        } finally {
            isRefreshingRef.current = false;
        }
    }, []);

    const refetchUser = useCallback(async (): Promise<void> => {
        try {
            const me = await getMe();
            if (cancelledRef.current) return;
            setState(s => ({ ...s, user: me }));
        } catch (err) {
            // 401 is already handled by the api interceptor (single refresh + retry,
            // or page reload on refresh failure) — by the time we see it here, the
            // recovery path has already run. For everything else (network, 5xx) the
            // existing user state is still valid: the mutation that called us already
            // succeeded server-side, we just couldn't refetch the latest snapshot.
            if (import.meta.env.DEV) {
                console.warn("[AuthProvider] refetchUser failed:", err);
            }
        }
    }, []);

    useEffect(() => {
        cancelledRef.current = false;
        restoreSession();

        return () => {
            cancelledRef.current = true;
        };
    }, [restoreSession]);

    // Collection queries (`collectionsList`/`collectionAlbum`) are keyed without the user,
    // so a login/logout doesn't refetch them on its own, to fix it we watch for auth state 
    // changes and invalidate them when it flips.

    const prevAuthRef = useRef<boolean | null>(null);
    
    useEffect(() => {
        if (state.isLoading) return;
        if (prevAuthRef.current !== null && prevAuthRef.current !== state.isAuthenticated) {
            queryClient.invalidateQueries({ queryKey: ['collectionsList'] });
            queryClient.invalidateQueries({ queryKey: ['collectionAlbum'] });
        }
        prevAuthRef.current = state.isAuthenticated;
    }, [state.isAuthenticated, state.isLoading, queryClient]);

    return (
        <AuthContext.Provider value={{ ...state, refreshAuth: restoreSession, refetchUser }}>
            {children}
        </AuthContext.Provider>
    );
};
