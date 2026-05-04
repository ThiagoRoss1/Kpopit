import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AuthContext, type AuthState } from "./auth_context";
import { getMe, refreshToken } from "../services/api";
import { setAccessToken, clearAccessToken } from "../services/tokenStore";

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [state, setState] = useState<AuthState>({
        isAuthenticated: false,
        isLoading: true,
        user: null,
    });
    
    const cancelledRef = useRef(false);
    const isRefreshingRef = useRef(false);

    const restoreSession = useCallback(async () => {
        if (isRefreshingRef.current) return;

        const hadSession = localStorage.getItem('kpopit_session');
        if (!hadSession) {
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
            clearAccessToken();
            localStorage.removeItem('kpopit_session');
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
