import { registerUser, claimUser, loginUser, logoutUser, refreshToken } from "../services/api"
import type { LoginData, RegisterData } from "../interfaces/authInterfaces"
import { decryptToken, encryptToken } from "../utils/tokenEncryption"
import { clearAccessToken, setAccessToken } from "../services/tokenStore"

export const useAuthUser = () => {
    const register = async (data: RegisterData) => {
        try {
            const encrypted = localStorage.getItem('userToken');

            if (encrypted) {
                const token = await decryptToken(encrypted);
                const response = await claimUser(token, data.username, data.email, data.password);
                setAccessToken(response.access_token);
                return response;
            } else {
                const response = await registerUser(data.username, data.email, data.password);
                setAccessToken(response.access_token);

                if (response.user?.user_token) {
                    const encryptedToken = await encryptToken(response.user.user_token);
                    localStorage.setItem('userToken', encryptedToken);
                }

                return response;
            } 
        } catch (error) {
            throw new Error("Registration failed: " + (error instanceof Error ? error.message : String(error)));
        }
    }

    const login = async (data: LoginData) => {
        try {
            const response = await loginUser(data.identifier, data.password, data.rememberMe);
            setAccessToken(response.access_token);

            if (response.user?.user_token) {
                const encryptedToken = await encryptToken(response.user.user_token);
                localStorage.setItem('userToken', encryptedToken); 
            }
            
            return response;
        } catch (error) {
            throw new Error("Login failed: " + (error instanceof Error ? error.message : String(error)));
        }
    }

    const logout = async () => {
        try {
            const response = await logoutUser();
            clearAccessToken();
            return response;
        } catch (error) {
            throw new Error("Logout failed: " + (error instanceof Error ? error.message : String(error)));
        }
    }

    const refresh = async () => {
        try {
            return await refreshToken();
        } catch (error) {
            throw new Error("Token refresh failed: " + (error instanceof Error ? error.message : String(error)));
        }
    }

    return {
        register,
        login,
        logout,
        refresh
    }
}