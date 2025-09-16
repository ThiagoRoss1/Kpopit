import axios from 'axios';

// Api instance with base URL
const api = axios.create({
    baseURL: 'http://127.0.0.1:5000/api',
});

// Get daily idol game data endpoint
export const getDailyIdol = async () => {
    const response = await api.get('/game/daily-idol');
    return response.data;
};
// Export guess idol api instance (entire idol career)
export interface GuessPayload {
    guessed_idol_id: number;
    answer_id: number;
}

export const getGuessIdol = async (payload: GuessPayload) => {
    const response = await api.post('/game/guess', payload);
    console.log("Resposta recebida da API /guess:", response.data);
    return response.data;
};

export const getAllIdols = async () => {
    const response = await api.get('/idols-list');
    return response.data;
};