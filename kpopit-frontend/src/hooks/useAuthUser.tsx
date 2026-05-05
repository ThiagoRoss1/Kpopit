import { registerUser, claimUser, loginUser, authError, logoutUser, refreshToken } from "../services/api"
import type { LoginData, RegisterData } from "../interfaces/authInterfaces"
import { decryptToken, encryptToken } from "../utils/tokenEncryption"
import { clearAccessToken, setAccessToken } from "../services/tokenStore"

const extractBackendError = (error: unknown, fallback: string) => {
    if (authError(error)) return error.response.data.error;
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}

export const useAuthUser = () => {
    const register = async (data: RegisterData) => {
        try {
            const encrypted = localStorage.getItem('userToken');

            if (encrypted) {
                const token = await decryptToken(encrypted);
                const response = await claimUser(token, data.username, data.email, data.password);
                setAccessToken(response.access_token);
                localStorage.setItem('kpopit_session', 'true');
                return response;
            } else {
                const response = await registerUser(data.username, data.email, data.password);
                setAccessToken(response.access_token);
                localStorage.setItem('kpopit_session', 'true');

                if (response.user?.user_token) {
                    const encryptedToken = await encryptToken(response.user.user_token);
                    localStorage.setItem('userToken', encryptedToken);
                }

                return response;
            }
        } catch (error) {
            throw new Error(extractBackendError(error, "Registration failed"));
        }
    }

    const login = async (data: LoginData) => {
        try {
            const response = await loginUser(data.identifier, data.password, data.rememberMe);
            setAccessToken(response.access_token);
            localStorage.setItem('kpopit_session', 'true');
            
            if (response.user?.user_token) {
                const encryptedToken = await encryptToken(response.user.user_token);
                localStorage.setItem('userToken', encryptedToken);
            }

            return response;
        } catch (error) {
            throw new Error(extractBackendError(error, "Login failed"));
        }
    }

    const logout = async () => {
        try {
            const response = await logoutUser();
            clearAccessToken();
            localStorage.removeItem('kpopit_session');
            localStorage.removeItem('userToken');
            return response;
        } catch (error) {
            throw new Error(extractBackendError(error, "Logout failed"));
        }
    }

    const refresh = async () => {
        try {
            return await refreshToken();
        } catch (error) {
            throw new Error(extractBackendError(error, "Token refresh failed"));
        }
    }

    return {
        register,
        login,
        logout,
        refresh
    }
}