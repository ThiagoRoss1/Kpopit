import axios from 'axios';
import type { CompleteGuessRequest } from '../interfaces/gameInterfaces';

// Api instance with base URL
const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api`,
});

// Get daily idol game data endpoint
export const getDailyIdol = async () => {
    const token = localStorage.getItem('userToken');
    const response = await api.get('/game/daily-idol', {
        headers: token ? { 'Authorization': token } : {}
    });
    return response.data;
};

export const getGuessIdol = async (payload: CompleteGuessRequest) => {
    const response = await api.post('/game/guess', payload);
    console.log("Answer received from API /guess:", response.data);
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