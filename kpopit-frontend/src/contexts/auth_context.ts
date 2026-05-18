import { createContext } from "react";
import type { MeResponse } from "../interfaces/authInterfaces";

export interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: MeResponse | null;
}

export interface AuthContextValue extends AuthState {
    refreshAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    refreshAuth: () => {
        throw new Error("useAuth must be used within an <AuthProvider>");
    },
});
