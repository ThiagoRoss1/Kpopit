import axios from 'axios';
import type { AddIdolRequest, CompleteGuessRequest } from '../interfaces/gameInterfaces';
import { decryptToken } from '../utils/tokenEncryption';
// Api instance with base URL
const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api`,
});

// Response interceptor to handle invalid user token globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 400) {
            if (error.response?.data?.error === 'Invalid user token') {
                console.warn("Invalid user token detected. Removing from localStorage.");
                localStorage.clear();

                window.location.reload();
            }

            else if (error.response?.data?.error === 'Game date mismatch') {
                console.warn("Game date mismatch detected. Reloading the page.");
                window.location.reload();
            }
        }
        return Promise.reject(error);
    }
);

// Get daily idol game data endpoint
export const getDailyIdol = async () => {
    const encrypted = localStorage.getItem('userToken');
    const token = encrypted ? await decryptToken(encrypted) : null;
    const response = await api.get('/game/daily-idol', {
        headers: token ? { 'Authorization': token } : {}
    });
    return response.data;
};

export const getGuessIdol = async (payload: CompleteGuessRequest) => {
    const response = await api.post('/game/guess', payload);
    if (import.meta.env.DEV) {
    console.log("Answer received from API /guess:", response.data);
    };
    return response.data;
};

export const getAllIdols = async () => {
    const response = await api.get('/idols-list');
    return response.data;
};

// Export yesterday's idol date
export const getYesterdaysIdol = async () => {
    const response = await api.get('/store-yesterdays-idol');
    return response.data;
};

export const getResetTimer = async () => {
    const response = await api.get('/reset-timer');
    return response.data;
};

// Get user token
export const getUserToken = async () => {
    const response = await api.post('/user/init');
    return response.data;
}

export const getUserStats = async (user_token: string) => {
    const response = await api.get(`/stats/${user_token}`);
    return response.data;
}

export const addNewIdol = async (idolData: AddIdolRequest) => {
    const response = await api.post('/admin/add-idol', idolData);
    return response.data;
}

export const getDailyUserCount = async () => {
    const response = await api.get('/daily-users-count');
    return response.data;
}

export const getUserPosition = async (user_token: string) => {
    const response = await api.get(`/daily-rank/${user_token}`);
    return response.data;
}

export const addGeneratedCodes = async (user_token: string) => {
    const response = await api.post(`/generate-transfer-code/${user_token}`);
    return response.data;
}

export const redeemTransferCode = async (code: string) => {
    const response = await api.post('/transfer-data', { code });
    return response.data;
}

export const saveGameState = async (gameState: object) => {
    const encrypted = localStorage.getItem("userToken");
    const token = encrypted ? await decryptToken(encrypted) : null;

    return api.post(`/game-state/${token}`, { game_state: gameState });
}

export const fetchGameState = async (user_token: string) => {
    const response = await api.get(`/game-state/${user_token}`);
    return response.data;
}

export const getActiveTransferCode = async (user_token: string) => {
    const response = await api.get(`/get-active-transfer-code/${user_token}`);
    return response.data;
}

// Blurry game APIs
export const getBlurryDailyIdol = async () => {
    const encrypted = localStorage.getItem('userToken');
    const token = encrypted ? await decryptToken(encrypted) : null;
    const response = await api.get('/game/blurry/daily-idol', {
        headers: token ? { 'Authorization': token } : {}
    });
    return response.data;
}

export const getBlurryGuessIdol = async (payload: CompleteGuessRequest) => {
    const response = await api.post('/game/blurry/guess', payload);
    if (import.meta.env.DEV) {
        console.log("Answer received from API /blurry/guess:", response.data);
    };
    return response.data;
}