// frontend/src/services/coinsService.js

import api from './api';

/** POST /api/coins/daily-login */
export const claimDailyLogin = async () => {
    return api.post('/coins/daily-login');
};

/** POST /api/coins/ad-reward */
export const claimAdReward = async () => {
    return api.post('/coins/ad-reward');
};

/** GET /api/coins/history?page=1&limit=20 */
export const fetchCoinHistory = async (page = 1, limit = 20) => {
    return api.get(`/coins/history?page=${page}&limit=${limit}`);
};