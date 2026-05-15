import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AuthContext, type AuthState } from "./auth_context";
import { getMe, refreshToken } from "../services/api";
import { setAccessToken, clearAccessToken } from "../services/tokenStore";
import { useClearGameStorage } from "../hooks/useClearGameStorage";

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

            setState({ isAuthenticated: true, isLoading: false, user: me });
        } catch {
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

    useEffect(() => {
        cancelledRef.current = false;
        restoreSession();
        
        return () => {
            cancelledRef.current = true;
        };
    }, [restoreSession]);

    return (
        <AuthContext.Provider value={{ ...state, refreshAuth: restoreSession }}>
            {children}
        </AuthContext.Provider>
    );
};
