import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext, type AuthState } from "./auth_context";
import { getMe, refreshToken, restoreSession as restoreGameSession } from "../services/api";
import { isSessionRejected, RESTORE_RETRY_DELAYS_MS } from "../utils/authErrors";
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
    const retryCountRef = useRef(0);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const transientFailureRef = useRef(false);
    const restoreSessionRef = useRef<() => Promise<void>>(async () => {});

    const restoreSession = useCallback(async () => {
        if (isRefreshingRef.current) return;
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }

        const hadSession =
            localStorage.getItem('kpopit_session') ??
            sessionStorage.getItem('kpopit_session');
        if (!hadSession) {
            transientFailureRef.current = false;
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

            retryCountRef.current = 0;
            transientFailureRef.current = false;
            setState({ isAuthenticated: true, isLoading: false, user: me });
        } catch (err) {
            if (!isSessionRejected(err)) {
                // A failed refresh cannot invalidate an already authenticated user/token.
                // On first load we still need the server to confirm the session.
                if (cancelledRef.current) return;
                transientFailureRef.current = true;
                setState(s => ({ ...s, isLoading: false }));
                const delay = RESTORE_RETRY_DELAYS_MS[retryCountRef.current];
                if (delay !== undefined) {
                    retryCountRef.current += 1;
                    retryTimerRef.current = setTimeout(() => restoreSessionRef.current(), delay);
                }
                return;
            }

            const wasAuthenticated = localStorage.getItem('kpopit_was_authenticated') === 'true';
            transientFailureRef.current = false;
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

    useEffect(() => {
        restoreSessionRef.current = restoreSession;
    }, [restoreSession]);

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
        const retryOnReconnect = () => {
            if (!transientFailureRef.current) return;
            retryCountRef.current = 0;
            void restoreSessionRef.current();
        };
        window.addEventListener('online', retryOnReconnect);
        window.addEventListener('focus', retryOnReconnect);

        return () => {
            cancelledRef.current = true;
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
            window.removeEventListener('online', retryOnReconnect);
            window.removeEventListener('focus', retryOnReconnect);
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
