import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext, type AuthState } from "./auth_context";
import { getMe, refreshToken, restoreSession as restoreGameSession } from "../services/api";
import { isSessionRejected, RESTORE_RETRY_DELAYS_MS } from "../utils/authErrors";
import { setAccessToken, clearAccessToken } from "../services/tokenStore";
import { useClearGameStorage } from "../hooks/useClearGameStorage";
import { applyRestoredSession } from "../utils/applyRestoredSession";
import type { MeResponse } from "../interfaces/authInterfaces";

interface AuthProviderProps {
    children: ReactNode;
}

type RestoreOutcome =
    | { kind: "authenticated"; user: MeResponse }
    | { kind: "transient" }
    | { kind: "rejected" }
    | { kind: "skipped" };

const hasSessionMarker = () =>
    (localStorage.getItem('kpopit_session') ?? sessionStorage.getItem('kpopit_session')) !== null;

export const AuthProvider = ({ children }: AuthProviderProps) => {
    // Without a session marker there is nothing to restore, so the first render is already final.
    const [state, setState] = useState<AuthState>(() => ({
        isAuthenticated: false,
        isLoading: hasSessionMarker(),
        user: null,
    }));

    const { clearAll } = useClearGameStorage();

    const queryClient = useQueryClient();

    const cancelledRef = useRef(false);
    const isRefreshingRef = useRef(false);
    const retryCountRef = useRef(0);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const transientFailureRef = useRef(false);
    const restoreSessionRef = useRef<() => Promise<void>>(async () => {});

    // No session marker: only the local leftovers of a lost authenticated session are wiped.
    const forgetLostSession = useCallback(() => {
        transientFailureRef.current = false;
        const wasAuthenticated = localStorage.getItem('kpopit_was_authenticated') === 'true';
        if (wasAuthenticated) {
            localStorage.removeItem('userToken');
            localStorage.removeItem('kpopit_was_authenticated');
            clearAll();
        }
    }, [clearAll]);

    // Talks to the server and handles storage/timers; React state is set by applyOutcome.
    const restoreFromServer = useCallback(async (): Promise<RestoreOutcome> => {
        if (isRefreshingRef.current) return { kind: "skipped" };
        isRefreshingRef.current = true;

        try {
            const data = await refreshToken();
            setAccessToken(data.access_token);

            const me = await getMe();

            if (cancelledRef.current) return { kind: "skipped" };

            try {
                const gameSession = await restoreGameSession();
                if (cancelledRef.current) return { kind: "skipped" };
                applyRestoredSession(gameSession);
            } catch (err) {
                if (import.meta.env.DEV) {
                    console.warn("Failed to restore game session after auth refresh:", err);
                }
            }

            retryCountRef.current = 0;
            transientFailureRef.current = false;
            return { kind: "authenticated", user: me };
        } catch (err) {
            if (!isSessionRejected(err)) {
                // A failed refresh cannot invalidate an already authenticated user/token.
                // On first load we still need the server to confirm the session.
                if (cancelledRef.current) return { kind: "skipped" };
                transientFailureRef.current = true;
                const delay = RESTORE_RETRY_DELAYS_MS[retryCountRef.current];
                if (delay !== undefined) {
                    retryCountRef.current += 1;
                    retryTimerRef.current = setTimeout(() => restoreSessionRef.current(), delay);
                }
                return { kind: "transient" };
            }

            const wasAuthenticated = localStorage.getItem('kpopit_was_authenticated') === 'true';
            transientFailureRef.current = false;
            clearAccessToken();
            localStorage.removeItem('kpopit_session');
            sessionStorage.removeItem('kpopit_session');
            if (wasAuthenticated) {
                // Wipe the UUID and game state only after a real session; a purely anonymous
                // user whose refresh failed keeps both.
                localStorage.removeItem('userToken');
                localStorage.removeItem('kpopit_was_authenticated');
                clearAll();
            }
            return { kind: "rejected" };
        } finally {
            isRefreshingRef.current = false;
        }
    }, [clearAll]);

    const applyOutcome = useCallback((outcome: RestoreOutcome) => {
        if (cancelledRef.current) return;
        if (outcome.kind === "authenticated") setState({ isAuthenticated: true, isLoading: false, user: outcome.user });
        else if (outcome.kind === "transient") setState(s => ({ ...s, isLoading: false }));
        else if (outcome.kind === "rejected") setState({ isAuthenticated: false, isLoading: false, user: null });
    }, []);

    const restoreSession = useCallback(async () => {
        if (isRefreshingRef.current) return;
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
        if (!hasSessionMarker()) {
            forgetLostSession();
            setState({ isAuthenticated: false, isLoading: false, user: null });
            return;
        }
        applyOutcome(await restoreFromServer());
    }, [forgetLostSession, restoreFromServer, applyOutcome]);

    useEffect(() => {
        restoreSessionRef.current = restoreSession;
    }, [restoreSession]);

    const refetchUser = useCallback(async (): Promise<void> => {
        try {
            const me = await getMe();
            if (cancelledRef.current) return;
            setState(s => ({ ...s, user: me }));
        } catch (err) {
            // A 401 was already handled by the api interceptor; on network/5xx the current user
            // state stays valid (the calling mutation succeeded, only the refetch failed).
            if (import.meta.env.DEV) {
                console.warn("[AuthProvider] refetchUser failed:", err);
            }
        }
    }, []);

    useEffect(() => {
        cancelledRef.current = false;
        if (hasSessionMarker()) void restoreFromServer().then(applyOutcome);
        else forgetLostSession();
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
    }, [restoreFromServer, forgetLostSession, applyOutcome]);

    // Collection queries aren't keyed by user, so refetch them when the auth state flips.

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
